/**
 * Deterministic mock DataSource. Same shapes as the future Postgres source.
 * Times are store-local and handled as UTC internally so the server's timezone never shifts them.
 */
import { Rng, hashSeed } from "@/lib/rng";
import { dayOfWeek, isoLocal } from "@/lib/time";
import type {
  AgreementRow,
  Clip,
  ClipScore,
  DataSource,
  ErrorKind,
  ErrorOutcome,
  ErrorTag,
  HourlyMetric,
  Screen,
  Store,
  TrackPoint,
  TrackState,
} from "./types";

const SEED = 7;
const START = Date.UTC(2026, 9, 11); // 11 Oct 2026
const DAYS = 14;
const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;
const CLIP_SECONDS = 300;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const config = { zoneRadiusM: 4, facingDeg: 60, minExposureS: 1, trackDt: 0.2 };

const STORES: Store[] = [
  { storeId: 1, storeName: "Store 001" },
];

interface ScreenSpec {
  id: number;
  store: number;
  code: string;
  name: string;
  zone: string;
  baseFt: number; // peak foot traffic / h
  rate: number; // exposure rate
  dwell: number; // median dwell s
  exposure: number; // median exposure s
  mount: Screen["cameraMount"];
}

const SPECS: ScreenSpec[] = [
  { id: 1, store: 1, code: "A", name: "Zone A", zone: "Entrance & Out of Category", baseFt: 140, rate: 0.14, dwell: 3.2, exposure: 1.4, mount: "overhead" },
  { id: 2, store: 1, code: "B", name: "Zone B", zone: "In Aisles", baseFt: 95, rate: 0.27, dwell: 6.5, exposure: 1.9, mount: "elevated" },
  { id: 3, store: 1, code: "C", name: "Zone C", zone: "Check out", baseFt: 120, rate: 0.38, dwell: 24, exposure: 2.6, mount: "elevated" },
];
const specById = new Map(SPECS.map((s) => [s.id, s]));

/** Relative traffic by hour: lunch bump plus a larger evening peak (~1.0 at 18:30). */
function hourCurve(h: number): number {
  return 0.35 + 0.45 * Math.exp(-(((h - 12) / 1.5) ** 2)) + 0.65 * Math.exp(-(((h - 18.5) / 2) ** 2));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;

function memo<T>(fn: () => T): () => T {
  let cache: T | undefined;
  return () => (cache ??= fn());
}

const screens = memo((): Screen[] =>
  SPECS.map((s) => ({
    screenId: s.id,
    storeId: s.store,
    storeName: STORES.find((st) => st.storeId === s.store)!.storeName,
    code: s.code,
    name: s.name,
    label: s.name,
    iabZone: s.zone,
    cameraMount: s.mount,
  })),
);

const hourly = memo((): HourlyMetric[] => {
  const rng = new Rng(SEED);
  const rows: HourlyMetric[] = [];
  for (const s of SPECS) {
    for (let d = 0; d < DAYS; d++) {
      const day = START + d * DAY_MS;
      const weekend = dayOfWeek(day) >= 5;
      for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
        const curve = hourCurve(h);
        const ft = rng.poisson(s.baseFt * curve * (weekend ? 1.35 : 1) * rng.lognormal(0, 0.08));
        // Queues at checkout make people linger, so exposure rises with crowding.
        const crowd = s.zone === "Check out" ? 0.25 : 0.08;
        const rate = clamp(s.rate * (1 + crowd * (curve - 0.6)) * rng.lognormal(0, 0.12), 0.01, 0.95);
        const ev = ft ? rng.binomial(ft, rate) : 0;
        const dwellMult = 1 + (s.zone === "Check out" ? 0.3 * curve : 0);
        rows.push({
          screenId: s.id,
          hourStart: isoLocal(day + h * HOUR_MS),
          footTraffic: ft,
          exposureEvents: ev,
          exposureRate: ft ? ev / ft : 0,
          medianDwellS: round(s.dwell * dwellMult * rng.lognormal(0, 0.15), 2),
          medianExposureS: round(s.exposure * rng.lognormal(0, 0.1), 2),
        });
      }
    }
  }
  return rows;
});

/** ~5 min clips sampled for human labelling (proposal Step 1). */
const clips = memo((): Clip[] => {
  const rng = new Rng(SEED + 1);
  const rows: Clip[] = [];
  for (const s of SPECS) {
    for (let i = 0; i < 16; i++) {
      const peak = i % 2 === 0;
      const weekend = Math.floor(i / 2) % 2 === 1;
      const pool = Array.from({ length: DAYS }, (_, d) => d).filter((d) => dayOfWeek(START + d * DAY_MS) >= 5 === weekend);
      const day = START + rng.choice(pool) * DAY_MS;
      const hour = rng.choice(peak ? [12, 18, 19] : [9, 10, 15, 21]);
      const start = day + hour * HOUR_MS + rng.int(0, 55) * 60_000;
      // Entrances get dim at night; otherwise a random 20% are poorly lit.
      const dim = (hour >= 19 && s.zone.startsWith("Entrance")) || rng.random() < 0.2;
      const density: Clip["density"] = peak && rng.random() < 0.6 ? "high" : peak || rng.random() < 0.4 ? "medium" : "low";
      rows.push({
        clipId: `${s.code}-${String(i + 1).padStart(2, "0")}`,
        screenId: s.id,
        startTs: isoLocal(start),
        durationS: CLIP_SECONDS,
        peak: peak ? "peak" : "off-peak",
        dayType: weekend ? "weekend" : "weekday",
        lighting: dim ? "dim" : "bright",
        density,
        // first 6 clips per screen tune the pipeline; the rest are scored once
        split: i < 6 ? "dev" : "test",
      });
    }
  }
  return rows;
});

const clipScores = memo((): ClipScore[] => {
  const rng = new Rng(SEED + 2);
  return clips().map((c) => {
    const s = specById.get(c.screenId)!;
    const t = new Date(c.startTs + "Z");
    const curve = hourCurve(t.getUTCHours() + t.getUTCMinutes() / 60);
    const weekend = c.dayType === "weekend" ? 1.35 : 1;
    const hours = c.durationS / 3600;

    const gtFt = rng.poisson(s.baseFt * curve * weekend * hours);
    const bias = { low: 0, medium: -0.4, high: -1.6 }[c.density]; // merged boxes in crowds
    const modelFt = Math.max(0, gtFt + Math.round(rng.normal(bias, 0.9)));

    const gtDwell = s.dwell * rng.lognormal(0, 0.15);
    const modelDwell = Math.max(0.2, gtDwell + rng.normal(0.25, 0.7 + (c.lighting === "dim" ? 0.5 : 0)));

    const gtEv = rng.poisson(s.baseFt * s.rate * curve * weekend * hours);
    let recall = 0.91 - (c.lighting === "dim" ? 0.09 : 0) - (c.density === "high" ? 0.08 : 0);
    recall -= s.mount === "overhead" ? 0.04 : 0;
    const tp = rng.binomial(gtEv, clamp(recall, 0.3, 1));
    const fp = rng.poisson(gtEv * (0.1 + (s.mount === "overhead" ? 0.06 : 0)));

    return {
      clipId: c.clipId,
      screenId: c.screenId,
      durationS: c.durationS,
      peak: c.peak,
      dayType: c.dayType,
      lighting: c.lighting,
      density: c.density,
      split: c.split,
      gtFootTraffic: gtFt,
      modelFootTraffic: modelFt,
      gtMedianDwellS: round(gtDwell, 2),
      modelMedianDwellS: round(modelDwell, 2),
      gtExposureEvents: gtEv,
      modelExposureEvents: tp + fp,
      tp,
      fp,
      fn: gtEv - tp,
    };
  });
});

/** Every miss tagged with the proposal's error taxonomy (Step 4). */
const errors = memo((): ErrorTag[] => {
  const rng = new Rng(SEED + 3);
  const kinds: ErrorKind[] = ["occlusion", "id_switch", "wrong_facing", "other"];
  const rows: ErrorTag[] = [];
  for (const c of clipScores()) {
    const mount = specById.get(c.screenId)!.mount;
    const w = [1, 0.6, 1, 0.3];
    if (c.density === "high") {
      w[0] += 1.5;
      w[1] += 0.8;
    }
    if (c.lighting === "dim" || mount === "overhead") w[2] += 1.4;
    const misses: [ErrorOutcome, number][] = [
      ["missed exposure", c.fn],
      ["false exposure", c.fp],
      ["count error", Math.abs(c.modelFootTraffic - c.gtFootTraffic)],
    ];
    for (const [outcome, n] of misses) {
      for (let i = 0; i < n; i++) {
        rows.push({
          errorId: rows.length + 1,
          clipId: c.clipId,
          screenId: c.screenId,
          split: c.split,
          lighting: c.lighting,
          density: c.density,
          outcome,
          kind: rng.choice(kinds, w),
          tOffsetS: round(rng.uniform(0, c.durationS), 1),
          trackId: rng.int(1, 40),
        });
      }
    }
  }
  return rows;
});

/** Annotator-vs-annotator agreement on the double-labelled 20% of clips. */
const agreement = memo((): AgreementRow[] => [
  { measure: "clips_double_labelled", value: Math.round(clips().length * 0.2), unit: "clips" },
  { measure: "ft_mae", value: 0.4, unit: "people_per_clip" },
  { measure: "dwell_mae", value: 0.5, unit: "s" },
  { measure: "exposure_kappa", value: 0.84, unit: "kappa" },
]);

const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
const deg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Per-person floor positions and head direction for one clip.
 * Floor frame (metres): screen on the wall at the origin facing +y; the
 * viewing zone is the half-disk of radius zoneRadiusM in front of it.
 */
const trackCache = new Map<string, TrackPoint[]>();
function trackPoints(clipId: string): TrackPoint[] {
  const hit = trackCache.get(clipId);
  if (hit) return hit;
  const clip = clips().find((c) => c.clipId === clipId);
  if (!clip) return [];
  const rng = new Rng(hashSeed(clipId));
  const dt = config.trackDt;
  const nPeople = clip.peak === "peak" ? rng.int(10, 16) : rng.int(5, 10);
  const windowS = 90;
  const out: TrackPoint[] = [];

  for (let tid = 1; tid <= nPeople; tid++) {
    const side = rng.random() < 0.5 ? -1 : 1;
    const a: [number, number] = [side * 8, rng.uniform(0.8, 9)];
    const b: [number, number] = [-side * 8, rng.uniform(0.8, 9)];
    const speed = rng.uniform(0.9, 1.4);
    let stop: [number, number] | null = null;
    let stopS = 0;
    if (rng.random() < 0.35) {
      // browses near the screen for a while
      stop = [rng.uniform(-2.5, 2.5), rng.uniform(1.2, 3.5)];
      stopS = rng.uniform(3, 12);
    }
    const legs = stop ? [a, stop, b] : [a, b];
    const pts: [number, number][] = [];
    const heads: number[] = [];
    for (let l = 0; l < legs.length - 1; l++) {
      const [p, q] = [legs[l], legs[l + 1]];
      const seg = [q[0] - p[0], q[1] - p[1]];
      const steps = Math.max(2, Math.floor(Math.hypot(seg[0], seg[1]) / speed / dt));
      for (let k = 0; k < steps; k++) {
        pts.push([p[0] + (seg[0] * k) / steps, p[1] + (seg[1] * k) / steps]);
        heads.push(deg(Math.atan2(seg[1], seg[0])));
      }
      if (stop && q === stop) {
        const shelf = rng.choice([-90, 0, 180]);
        for (let k = 0; k < Math.floor(stopS / dt); k++) {
          pts.push([q[0] + rng.normal(0, 0.04), q[1] + rng.normal(0, 0.04)]);
          heads.push(shelf + rng.normal(0, 10));
        }
      }
    }
    for (let i = 0; i < heads.length; i++) heads[i] += rng.normal(0, 6);

    const inZone = pts.map(([x, y]) => Math.hypot(x, y) <= config.zoneRadiusM && y >= 0);
    const toScreen = pts.map(([x, y]) => deg(Math.atan2(-y, -x)));
    // Some people glance at the screen while in the zone.
    const zoneIdx = inZone.flatMap((z, i) => (z ? [i] : []));
    if (zoneIdx.length && rng.random() < 0.55) {
      const g0 = rng.choice(zoneIdx);
      const gLen = Math.floor(rng.uniform(0.4, 3.5) / dt);
      for (let i = g0; i < Math.min(g0 + gLen, heads.length); i++) heads[i] = toScreen[i] + rng.normal(0, 12);
    }
    const duration = pts.length * dt;
    const t0 = duration < windowS ? rng.uniform(0, windowS - duration) : 0;
    pts.forEach(([x, y], i) => {
      const yaw = wrap(heads[i] - toScreen[i]);
      const facing = inZone[i] && Math.abs(yaw) <= config.facingDeg;
      const state: TrackState = facing ? "facing" : inZone[i] ? "in_zone" : "outside";
      out.push({ trackId: tid, tS: round(t0 + i * dt, 2), xM: round(x, 2), yM: round(y, 2), headYawDeg: round(yaw, 1), state });
    });
  }
  trackCache.set(clipId, out);
  return out;
}

export const mockSource: DataSource = {
  name: "mock",
  config,
  stores: async () => STORES,
  screens: async () => screens(),
  hourly: async () => hourly(),
  clips: async () => clips(),
  clipScores: async () => clipScores(),
  errors: async () => errors(),
  agreement: async () => agreement(),
  trackPoints: async (clipId) => trackPoints(clipId),
};
