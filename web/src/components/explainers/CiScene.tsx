"use client";

/**
 * 95% CI explainer (bootstrap): a screen's 12 observed hours are resampled with replacement,
 * each resample's average drops onto a number line, and once the pile has formed the middle
 * 95% is bracketed as the confidence interval.
 */
import { useI18n } from "@/components/i18n/I18nProvider";

import { useLoopTime } from "./useLoopTime";

const W = 300;
const H = 182;
const HOURS = [0, 1, 0, 2, 0, 1, 0, 0, 1, 3, 0, 1]; // exposure events in each observed hour
const N = 40; // resamples shown
const DROP_S = 0.16; // seconds per resample
const BUILD_S = N * DROP_S;
const LOOP_S = BUILD_S + 4;
const X0 = 24;
const X1 = W - 24;
const MAX_V = 1.6; // number line 0 … 1.6 events/h
const BIN = 0.0625;
const AXIS_Y = 140;
const DOT_R = 3.2;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const xOf = (v: number) => X0 + ((X1 - X0) * Math.min(v, MAX_V)) / MAX_V;

/** Deterministic resamples (same every render and on the server). */
const RESAMPLES = (() => {
  let s = 12345;
  const next = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  return Array.from({ length: N }, () => {
    const picks = HOURS.map(() => Math.floor(next() * HOURS.length));
    return { picks, mean: mean(picks.map((i) => HOURS[i])) };
  });
})();

// Stack the averages into bins so they form a pile.
const STACKED = (() => {
  const height = new Map<number, number>();
  return RESAMPLES.map((r) => {
    const bin = Math.round(r.mean / BIN);
    const level = height.get(bin) ?? 0;
    height.set(bin, level + 1);
    return { x: xOf(bin * BIN), y: AXIS_Y - DOT_R - 1 - level * (DOT_R * 2 + 0.6) };
  });
})();

// Middle 95% of the averages (drop the lowest and highest 2.5%).
const SORTED = RESAMPLES.map((r) => r.mean).sort((a, b) => a - b);
const LO = SORTED[Math.floor(N * 0.025)];
const HI = SORTED[Math.ceil(N * 0.975) - 1];
const OBSERVED = mean(HOURS);

export function CiScene({ active }: { active: boolean }) {
  const { t: d } = useI18n();
  const S = d.explain.ci;
  const t = useLoopTime(LOOP_S, active, LOOP_S - 0.5);
  const shown = Math.min(N, Math.max(1, Math.floor(t / DROP_S) + 1));
  const built = t >= BUILD_S;
  const current = RESAMPLES[shown - 1];
  const counts = new Map<number, number>();
  for (const i of current.picks) counts.set(i, (counts.get(i) ?? 0) + 1);
  const cellW = (W - 24) / HOURS.length;

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-hidden>
        <rect x={0} y={0} width={W} height={H} rx={8} fill="var(--surface)" />

        {/* the observed hours; highlighted = drawn into the current resample (×n = drawn n times) */}
        <text x={12} y={14} fontSize={9} fill="var(--ink-2)">
          {S.hours}
        </text>
        {HOURS.map((v, i) => {
          const n = built ? 0 : (counts.get(i) ?? 0);
          const x = 12 + i * cellW;
          return (
            <g key={i}>
              <rect x={x + 1} y={20} width={cellW - 2} height={18} rx={3} fill={n ? "var(--series-1)" : "var(--grid)"} opacity={n ? 0.9 : 1} />
              <text x={x + cellW / 2} y={33} fontSize={10} textAnchor="middle" fontWeight={600} fill={n ? "var(--surface)" : "var(--ink-2)"} className="tabular">
                {v}
              </text>
              {n > 1 && (
                <text x={x + cellW / 2} y={48} fontSize={8} textAnchor="middle" fill="var(--series-1)" className="tabular">
                  ×{n}
                </text>
              )}
            </g>
          );
        })}
        <text x={W / 2} y={64} fontSize={10} textAnchor="middle" fill="var(--ink)" fontWeight={600} className="tabular">
          {built ? S.done(N) : S.resample(shown, current.mean.toFixed(2))}
        </text>

        {/* pile of resample averages */}
        {STACKED.slice(0, shown).map((p, i) => {
          const inside = RESAMPLES[i].mean >= LO && RESAMPLES[i].mean <= HI;
          const isNew = !built && i === shown - 1;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={DOT_R}
              fill={built && !inside ? "var(--muted)" : isNew ? "var(--series-2)" : "var(--series-1)"}
              opacity={built && !inside ? 0.45 : 1}
            />
          );
        })}

        {/* number line */}
        <line x1={X0} x2={X1} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--axis)" />
        {[0, 0.4, 0.8, 1.2, 1.6].map((v) => (
          <text key={v} x={xOf(v)} y={AXIS_Y + 11} fontSize={8} textAnchor="middle" fill="var(--muted)" className="tabular">
            {v}
          </text>
        ))}
        <line x1={xOf(OBSERVED)} x2={xOf(OBSERVED)} y1={78} y2={AXIS_Y} stroke="var(--ink-2)" strokeDasharray="2 2" />
        <text x={xOf(OBSERVED) + 3} y={84} fontSize={8} fill="var(--ink-2)">
          {S.observed(OBSERVED.toFixed(2))}
        </text>

        {/* the 95% bracket */}
        <g opacity={built ? 1 : 0} style={{ transition: "opacity 400ms" }}>
          <line x1={xOf(LO)} x2={xOf(HI)} y1={AXIS_Y + 20} y2={AXIS_Y + 20} stroke="var(--series-1)" strokeWidth={2.5} />
          <line x1={xOf(LO)} x2={xOf(LO)} y1={AXIS_Y + 15} y2={AXIS_Y + 25} stroke="var(--series-1)" strokeWidth={2} />
          <line x1={xOf(HI)} x2={xOf(HI)} y1={AXIS_Y + 15} y2={AXIS_Y + 25} stroke="var(--series-1)" strokeWidth={2} />
          <text x={(xOf(LO) + xOf(HI)) / 2} y={AXIS_Y + 36} fontSize={10} fontWeight={700} textAnchor="middle" fill="var(--ink)" className="tabular">
            {S.interval(LO.toFixed(2), HI.toFixed(2))}
          </text>
        </g>
      </svg>
      <div className="mt-2 flex flex-col gap-1 text-xs">
        <div className="text-ink font-semibold">{S.overlap}</div>
        <div className="text-muted">{S.noOverlap}</div>
      </div>
    </>
  );
}
