/** Metric calculations shared by the pages. Pure functions; work on mock or DB rows alike. */
import { Rng } from "@/lib/rng";
import type { ClipScore, HourlyMetric, TrackPoint } from "@/lib/data/types";

export type MetricKey = "ftWape" | "dwellMae" | "precision" | "recall";

/** H1 accuracy targets (placeholders until agreed with CP Axtra). Not shown on the dashboard. */
export interface Target {
  key: MetricKey;
  unit: "" | "%" | "s";
  target: number;
  better: "lower" | "higher";
}

/** Pass/fail targets for H1. PLACEHOLDERS until agreed with CP Axtra. */
export const TARGETS: Target[] = [
  { key: "ftWape", unit: "%", target: 10, better: "lower" },
  { key: "dwellMae", unit: "s", target: 1.5, better: "lower" },
  { key: "precision", unit: "", target: 0.8, better: "higher" },
  { key: "recall", unit: "", target: 0.8, better: "higher" },
];

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : NaN);

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

/** 95% percentile-bootstrap interval of the mean. */
export function bootstrapCi(values: number[], seed = 0, nBoot = 2000): [number, number] {
  if (values.length < 2) return [NaN, NaN];
  const rng = new Rng(seed + 1);
  const means = new Array<number>(nBoot);
  for (let b = 0; b < nBoot; b++) {
    let s = 0;
    for (let i = 0; i < values.length; i++) s += values[rng.int(0, values.length)];
    means[b] = s / values.length;
  }
  means.sort((a, b) => a - b);
  return [percentile(means, 0.025), percentile(means, 0.975)];
}

export function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const g = m.get(k);
    if (g) g.push(r);
    else m.set(k, [r]);
  }
  return m;
}

export interface ScreenSummary {
  screenId: number;
  sei: number;
  seiLow: number;
  seiHigh: number;
  footTrafficPerH: number;
  exposureRate: number;
  medianDwellS: number;
  medianExposureS: number;
  hours: number;
  rank: number;
}

/** SEI (exposure events per hour) with a 95% bootstrap CI, plus supporting metrics. Sorted by SEI desc. */
export function screenSummary(hourly: HourlyMetric[]): ScreenSummary[] {
  const rows = [...groupBy(hourly, (h) => h.screenId)].map(([screenId, g]) => {
    const ev = g.map((h) => h.exposureEvents);
    const ft = sum(g.map((h) => h.footTraffic));
    const [lo, hi] = bootstrapCi(ev, screenId);
    return {
      screenId,
      sei: mean(ev),
      seiLow: lo,
      seiHigh: hi,
      footTrafficPerH: ft / g.length,
      exposureRate: ft ? sum(ev) / ft : 0,
      medianDwellS: median(g.map((h) => h.medianDwellS)),
      medianExposureS: median(g.map((h) => h.medianExposureS)),
      hours: g.length,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.sei - a.sei);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export interface Score {
  ftWape: number;
  ftMae: number;
  dwellMae: number;
  precision: number;
  recall: number;
  clips: number;
}

/** H1 metrics for a set of scored clips. */
export function score(clips: ClipScore[]): Score {
  const gtFt = sum(clips.map((c) => c.gtFootTraffic));
  const ftErr = clips.map((c) => Math.abs(c.modelFootTraffic - c.gtFootTraffic));
  const tp = sum(clips.map((c) => c.tp));
  const fp = sum(clips.map((c) => c.fp));
  const fn = sum(clips.map((c) => c.fn));
  return {
    ftWape: gtFt ? (100 * sum(ftErr)) / gtFt : NaN,
    ftMae: mean(ftErr),
    dwellMae: mean(clips.map((c) => Math.abs(c.modelMedianDwellS - c.gtMedianDwellS))),
    precision: tp + fp ? tp / (tp + fp) : NaN,
    recall: tp + fn ? tp / (tp + fn) : NaN,
    clips: clips.length,
  };
}

export function meets(t: Target, value: number): boolean {
  return t.better === "lower" ? value <= t.target : value >= t.target;
}

export const h1Passes = (s: Score) => TARGETS.every((t) => meets(t, s[t.key]));

export interface ValidationRow {
  condition: string;
  target: Target;
  value: number;
  passes: boolean;
  clips: number;
}

/** One row per (condition, metric). `by` returns the condition label for a clip. */
export function validationBy(clips: ClipScore[], by: ((c: ClipScore) => string) | null): ValidationRow[] {
  const groups: [string, ClipScore[]][] = by ? [...groupBy(clips, by)].sort(([a], [b]) => a.localeCompare(b)) : [["All clips", clips]];
  return groups.flatMap(([condition, g]) => {
    const s = score(g);
    return TARGETS.map((t) => ({ condition, target: t, value: s[t.key], passes: meets(t, s[t.key]), clips: s.clips }));
  });
}

/** Rank agreement between two orderings of the same items (1 = identical). */
export function kendallTau<T>(a: T[], b: T[]): number {
  const pos = new Map(b.map((x, i) => [x, i]));
  let c = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) c += pos.get(a[i])! < pos.get(a[j])! ? 1 : -1;
  return a.length > 1 ? c / ((a.length * (a.length - 1)) / 2) : NaN;
}

export interface SeiComparison {
  screenId: number;
  modelSei: number;
  gtSei: number;
  ciLow: number;
  ciHigh: number;
  clips: number;
  modelRank: number;
  gtRank: number;
}

/** H2: SEI per screen from model vs. human labels on the same test clips. Sorted by model rank. */
export function seiComparison(clips: ClipScore[]): SeiComparison[] {
  const rows = [...groupBy(clips, (c) => c.screenId)].map(([screenId, g]) => {
    const model = g.map((c) => c.modelExposureEvents / (c.durationS / 3600));
    const gt = g.map((c) => c.gtExposureEvents / (c.durationS / 3600));
    const [lo, hi] = bootstrapCi(model, screenId);
    return { screenId, modelSei: mean(model), gtSei: mean(gt), ciLow: lo, ciHigh: hi, clips: g.length, modelRank: 0, gtRank: 0 };
  });
  [...rows].sort((a, b) => b.gtSei - a.gtSei).forEach((r, i) => (r.gtRank = i + 1));
  rows.sort((a, b) => b.modelSei - a.modelSei).forEach((r, i) => (r.modelRank = i + 1));
  return rows;
}

export interface H2Verdict {
  orderMatches: boolean;
  tau: number;
  pairs: { higher: number; lower: number; separable: boolean }[];
  separable: number;
  passes: boolean;
}

/** Rank order must match and each neighbouring pair must be separable (CIs don't overlap). */
export function h2Verdict(cmp: SeiComparison[]): H2Verdict {
  const modelOrder = [...cmp].sort((a, b) => a.modelRank - b.modelRank);
  const gtOrder = [...cmp].sort((a, b) => a.gtRank - b.gtRank).map((r) => r.screenId);
  const ids = modelOrder.map((r) => r.screenId);
  const pairs = modelOrder.slice(0, -1).map((r, i) => ({
    higher: r.screenId,
    lower: modelOrder[i + 1].screenId,
    separable: r.ciLow > modelOrder[i + 1].ciHigh,
  }));
  const orderMatches = ids.every((id, i) => id === gtOrder[i]);
  return {
    orderMatches,
    tau: kendallTau(ids, gtOrder),
    pairs,
    separable: pairs.filter((p) => p.separable).length,
    passes: orderMatches && pairs.every((p) => p.separable),
  };
}

/** Contiguous true runs of a boolean series as [start, end) times. */
export function runs(mask: boolean[], t: number[], dt: number): [number, number][] {
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && start === null) start = t[i];
    else if (!mask[i] && start !== null) {
      out.push([start, t[i - 1] + dt]);
      start = null;
    }
  }
  if (start !== null) out.push([start, t[t.length - 1] + dt]);
  return out;
}

export interface TrackSummary {
  trackId: number;
  firstSeenS: number;
  lastSeenS: number;
  enteredZone: boolean;
  dwellS: number;
  longestFacingS: number;
  exposureEvent: boolean;
  zoneRuns: [number, number][];
  facingRuns: [number, number][];
}

export function trackSummary(points: TrackPoint[], dt: number, minExposureS: number): TrackSummary[] {
  return [...groupBy(points, (p) => p.trackId)].map(([trackId, g]) => {
    const t = g.map((p) => p.tS);
    const inZone = g.map((p) => p.state !== "outside");
    const facingRuns = runs(g.map((p) => p.state === "facing"), t, dt);
    const longest = Math.max(0, ...facingRuns.map(([s, e]) => e - s));
    return {
      trackId,
      firstSeenS: t[0],
      lastSeenS: t[t.length - 1],
      enteredZone: inZone.some(Boolean),
      dwellS: inZone.filter(Boolean).length * dt,
      longestFacingS: longest,
      exposureEvent: longest >= minExposureS - 1e-9,
      zoneRuns: runs(inZone, t, dt),
      facingRuns,
    };
  });
}
