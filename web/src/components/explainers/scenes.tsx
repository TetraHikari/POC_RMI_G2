"use client";

/**
 * Top-down animated explainers for the three measurements.
 * Stage: wall along the top, ad screen at its centre, half-disk viewing zone (4 m) below it.
 * Animation time is the real timeline (seconds), so on-screen timers match what you see.
 */
import { useI18n } from "@/components/i18n/I18nProvider";

import { useLoopTime } from "./useLoopTime";

const W = 300;
const H = 170;
const SCREEN = { x: 150, y: 20 };
const ZONE_R = 110; // = 4 m
const FACING_DEG = 60;

type Key = { t: number; x: number; y: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);
const deg = (r: number) => (r * 180) / Math.PI;
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/** Position along a keyframed path (eased per segment); before/after the path → hidden. */
function along(keys: Key[], t: number): { x: number; y: number; visible: boolean; moving: boolean; heading: number } {
  if (t < keys[0].t || t > keys[keys.length - 1].t) return { x: -99, y: -99, visible: false, moving: false, heading: 0 };
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const u = ease(clamp01((t - a.t) / (b.t - a.t || 1)));
  const moving = a.x !== b.x || a.y !== b.y;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, visible: true, moving, heading: deg(Math.atan2(b.y - a.y, b.x - a.x)) };
}

const inZone = (x: number, y: number) => Math.hypot(x - SCREEN.x, y - SCREEN.y) <= ZONE_R && y >= SCREEN.y;
const toScreen = (x: number, y: number) => deg(Math.atan2(SCREEN.y - y, SCREEN.x - x));

/** First time (sampled) a path enters the zone, or Infinity. */
function firstEntry(keys: Key[]): number {
  for (let t = keys[0].t; t <= keys[keys.length - 1].t; t += 0.02) {
    const p = along(keys, t);
    if (inZone(p.x, p.y)) return t;
  }
  return Infinity;
}

function Stage({ children, glow = false }: { children: React.ReactNode; glow?: boolean }) {
  const { t } = useI18n();
  const zone = `M ${SCREEN.x - ZONE_R} ${SCREEN.y} A ${ZONE_R} ${ZONE_R} 0 0 0 ${SCREEN.x + ZONE_R} ${SCREEN.y} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-hidden>
      <rect x={0} y={0} width={W} height={H} rx={8} fill="var(--surface)" />
      <path d={zone} fill="var(--zone-fill)" stroke="var(--series-1)" strokeWidth={1} />
      <line x1={8} x2={W - 8} y1={SCREEN.y - 4} y2={SCREEN.y - 4} stroke="var(--axis)" strokeWidth={2} />
      {glow && <path d="M 124 20 L 108 62 Q 150 78 192 62 L 176 20 Z" fill="var(--series-2)" opacity={0.12} />}
      <rect
        x={SCREEN.x - 26}
        y={SCREEN.y - 9}
        width={52}
        height={9}
        rx={2}
        fill={glow ? "var(--series-2)" : "var(--ink)"}
        
      />
      <text x={SCREEN.x} y={SCREEN.y + 14} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--ink-2)">
        {t.explain.adScreen}
      </text>
      <text x={SCREEN.x + ZONE_R - 4} y={SCREEN.y + 14} textAnchor="end" fontSize={9} fill="var(--series-1)">
        {t.explain.zone}
      </text>
      {children}
    </svg>
  );
}

function Person({ x, y, color, heading = 0, bodyHeading = heading, cone = false }: { x: number; y: number; color: string; heading?: number; bodyHeading?: number; cone?: boolean }) {
  const { t } = useI18n();
  return (
    <g transform={`translate(${x} ${y})`}>
      {cone && (
        <g transform={`rotate(${heading})`}>
          <path d="M 0 0 L 27 -46.77 A 54 54 0 0 1 27 46.77 Z" fill="var(--series-2)" fillOpacity={0.12} stroke="var(--series-2)" strokeOpacity={0.5} strokeWidth={0.8} />
          <path d="M 0 0 L 48 0" stroke="var(--series-2)" strokeWidth={0.8} strokeDasharray="2 3" />
        </g>
      )}
      <g transform={`rotate(${bodyHeading})`}>
        <ellipse cx={-2} rx={5} ry={10} fill={color} stroke="var(--surface)" strokeWidth={1.5} />
      </g>
      <g transform={`rotate(${heading})`}>
        <circle cx={2} r={5} fill={color} stroke="var(--surface)" strokeWidth={1.5} />
        <path d="M 6 -2.5 L 11 0 L 6 2.5 Z" fill="var(--ink)" />
      </g>
      {cone && <text x={0} y={25} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--ink-2)">{t.explain.angle}</text>}
    </g>
  );
}

function Trail({ keys, time }: { keys: Key[]; time: number }) {
  return <g>{Array.from({ length: 7 }, (_, i) => {
    const p = along(keys, time - (i + 1) * 0.12);
    return p.visible && p.moving ? <circle key={i} cx={p.x} cy={p.y} r={1.8} fill="var(--ink-2)" opacity={0.24 * (1 - i / 7)} /> : null;
  })}</g>;
}

// Integrate only elapsed intervals; partial frames never add future time.
function zoneTime(keys: Key[], time: number): number {
  let total = 0;
  for (let s = 0; s < time; s += 0.01) {
    const dt = Math.min(0.01, time - s);
    const p = along(keys, s + dt / 2);
    if (p.visible && inZone(p.x, p.y)) total += dt;
  }
  return total;
}

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="text-ink tabular mt-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs">{children}</div>;
}

/* ---------------- Foot traffic ---------------- */

const FT_WALKERS: Key[][] = [
  [
    { t: 0, x: -12, y: 70 },
    { t: 4.2, x: 312, y: 92 },
  ],
  [
    { t: 1.3, x: 312, y: 128 },
    { t: 5.6, x: -12, y: 110 },
  ],
  [
    // passes below the zone: never counted
    { t: 2.4, x: -12, y: 162 },
    { t: 6.2, x: 312, y: 158 },
  ],
];
const FT_ENTRY = FT_WALKERS.map(firstEntry);

export function FootTrafficScene({ active }: { active: boolean }) {
  const { t: d } = useI18n();
  const t = useLoopTime(7, active, 3.2);
  const counted = FT_ENTRY.filter((e) => e <= t).length;
  return (
    <>
      <Stage>
        {FT_WALKERS.map((keys, i) => {
          const p = along(keys, t);
          if (!p.visible) return null;
          const entered = FT_ENTRY[i] <= t;
          const pop = (t - FT_ENTRY[i]) / 1.2;
          const entry = along(keys, FT_ENTRY[i]);
          return <g key={i}>
            <Trail keys={keys} time={t} />
            <Person x={p.x} y={p.y} heading={p.heading} color={entered ? "var(--series-1)" : "var(--muted)"} />
            {pop >= 0 && pop < 1 && <g opacity={1 - pop * pop}>
              <circle cx={entry.x} cy={entry.y} r={10 + pop * 12} fill="var(--series-1)" fillOpacity={0.08} stroke="var(--series-1)" strokeOpacity={0.5} />
              <text x={entry.x} y={entry.y - 15 - pop * 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--series-1)">{d.explain.footTraffic.increment}</text>
            </g>}
          </g>;
        })}
      </Stage>
      <Caption>
        <span className="font-semibold">{d.explain.footTraffic.counter(counted)}</span>
        <span className="text-muted">{d.explain.footTraffic.note}</span>
      </Caption>
    </>
  );
}

/* ---------------- Dwell time ---------------- */

const DWELL_PATH: Key[] = [
  { t: 0, x: -12, y: 104 },
  { t: 1.8, x: 118, y: 92 },
  { t: 4.8, x: 118, y: 92 }, // browsing near the screen
  { t: 6.6, x: 312, y: 110 },
];

export function DwellScene({ active }: { active: boolean }) {
  const { t: d, locale } = useI18n();
  const t = useLoopTime(7.6, active, 3.6);
  const dwell = zoneTime(DWELL_PATH, t);
  const p = along(DWELL_PATH, t);
  const nowIn = p.visible && inZone(p.x, p.y);
  const total = zoneTime(DWELL_PATH, 7.6);
  const turn = ease(clamp01((t - 1.8) / 0.6)) * (1 - ease(clamp01((t - 4.4) / 0.4)));
  const walking = -5;
  const heading = walking + wrap(toScreen(p.x, p.y) - walking) * turn;
  return (
    <>
      <Stage>
        <Trail keys={DWELL_PATH} time={t} />
        {p.visible && <>
          <Person x={p.x} y={p.y} heading={heading} bodyHeading={walking} color={nowIn ? "var(--series-1)" : "var(--muted)"} />
          {/* Show the floating timer once the shopper has entered the zone, not before. */}
          {dwell > 0 && <g transform={`translate(${Math.min(260, Math.max(40, p.x))} ${p.y + 26})`}>
            <rect x={-29} y={-11} width={58} height={19} rx={9} fill="var(--surface)" stroke={nowIn ? "var(--series-1)" : "var(--axis)"} />
            <text textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)" className="tabular">{d.explain.dwell.timer(dwell.toFixed(1), d.units.s)}</text>
          </g>}
        </>}
      </Stage>
      <Caption>
        <span className="font-semibold">{d.explain.dwell.counter(dwell.toFixed(1), d.units.s)}</span>
        <span className="bg-grid relative h-1.5 w-28 overflow-hidden rounded-full" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${clamp01(dwell / total) * 100}%`, background: "var(--series-1)" }} />
        </span>
        <span className="text-muted" lang={locale}>
          {nowIn ? d.explain.dwell.inside : d.explain.dwell.outside}
        </span>
      </Caption>
    </>
  );
}

/* ---------------- Exposure event ---------------- */

const EXPO_PATH: Key[] = [
  { t: 0, x: 312, y: 122 },
  { t: 2.2, x: 196, y: 96 },
  { t: 5.6, x: 196, y: 96 },
  { t: 7.8, x: -12, y: 118 },
];
const TURN_IN = [2.6, 3.1]; // head turns toward the screen
const TURN_OUT = [5.1, 5.5]; // and away again

function expoHeading(t: number, x: number, y: number, walking: number): number {
  const target = toScreen(x, y);
  const mix = (from: number, to: number, u: number) => from + wrap(to - from) * ease(clamp01(u));
  if (t < TURN_IN[0]) return walking;
  if (t < TURN_IN[1]) return mix(walking, target, (t - TURN_IN[0]) / (TURN_IN[1] - TURN_IN[0]));
  if (t < TURN_OUT[0]) return target + 6 * Math.sin((t - TURN_IN[1]) * Math.PI); // small natural sway
  if (t < TURN_OUT[1]) return mix(target, 170, (t - TURN_OUT[0]) / (TURN_OUT[1] - TURN_OUT[0]));
  return 170;
}

export function ExposureScene({ active }: { active: boolean }) {
  const { t: d } = useI18n();
  const E = d.explain.exposure;
  const T = 8.6;
  const t = useLoopTime(T, active, 4.4);

  const state = (s: number) => {
    const p = along(EXPO_PATH, s);
    const walking = deg(Math.atan2(EXPO_PATH[1].y - EXPO_PATH[0].y, EXPO_PATH[1].x - EXPO_PATH[0].x));
    const heading = expoHeading(s, p.x, p.y, walking);
    const near = p.visible && inZone(p.x, p.y);
    const facing = near && Math.abs(wrap(heading - toScreen(p.x, p.y))) <= FACING_DEG;
    return { p, heading, near, facing };
  };
  const now = state(t);
  // Current continuous facing run, and whether a ≥1 s run has happened yet this loop.
  let run = 0;
  let achieved = false;
  for (let s = 0; s < t; s += 0.01) {
    const dt = Math.min(0.01, t - s);
    run = state(s + dt / 2).facing ? run + dt : 0;
    if (run >= 1) achieved = true;
  }

  if (!now.facing) run = 0;

  const checks = [
    { ok: now.near, label: E.c1 },
    { ok: now.facing, label: E.c2 },
    { ok: now.facing && run >= 1, label: E.c3, extra: now.facing ? E.timer(Math.min(run, 1).toFixed(1), d.units.s) : null },
  ];

  return (
    <>
      <Stage glow={now.facing}>
        <Trail keys={EXPO_PATH} time={t} />
        {now.p.visible && (
          <>
            {now.facing && <line x1={now.p.x} y1={now.p.y} x2={SCREEN.x} y2={SCREEN.y} stroke="var(--series-2)" strokeWidth={2} strokeDasharray="4 3" />}
            <Person x={now.p.x} y={now.p.y} heading={now.heading} bodyHeading={170} cone={now.near} color={now.facing ? "var(--series-2)" : now.near ? "var(--series-1)" : "var(--muted)"} />
          </>
        )}
      </Stage>
      <ul className="mt-2 flex flex-col gap-1 text-xs">
        {checks.map((c, i) => (
          <li key={i} className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 transition-colors ${c.ok ? "text-ink" : "text-muted"}`}>
            <span
              aria-hidden
              className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
                c.ok ? "border-good bg-good text-surface" : "border-axis"
              }`}
            >
              {c.ok ? "✓" : i + 1}
            </span>
            <span>{c.label}</span>
            {c.extra && <span className="text-ink-2 tabular ml-auto whitespace-nowrap pl-2">{c.extra}</span>}
          </li>
        ))}
      </ul>
      <div className="mt-2 h-6">
        <span
          className="border-good/40 bg-good/10 text-good-text inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all duration-300"
          style={{ opacity: achieved ? 1 : 0, transform: achieved ? "scale(1)" : "scale(0.85)" }}
        >
          {E.result}
        </span>
      </div>
    </>
  );
}
