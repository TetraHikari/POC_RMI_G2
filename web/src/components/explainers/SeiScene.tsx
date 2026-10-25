"use client";

/**
 * SEI explainer: two screens observed over the same hour. Exposure events pop up
 * in each viewing zone and are tallied; when the hour ends, SEI = events ÷ 1 hour.
 */
import { useI18n } from "@/components/i18n/I18nProvider";

import { useLoopTime } from "./useLoopTime";

const W = 300;
const H = 196;
const HOUR_S = 6; // seconds of animation that represent one store hour
const LOOP_S = 9.5;
const ZONE_R = 46;
const WALL_Y = 40;

interface Panel {
  key: "A" | "B";
  cx: number;
  color: string;
  // [seconds into the hour, x offset, y offset] for each exposure event
  events: [number, number, number][];
}

const PANELS: Panel[] = [
  {
    key: "A",
    cx: 78,
    color: "var(--series-1)",
    events: [
      [0.3, -14, 22],
      [0.9, 12, 30],
      [1.4, -24, 14],
      [2.0, 20, 18],
      [2.6, -6, 34],
      [3.3, 24, 10],
      [3.9, -18, 28],
      [4.6, 8, 20],
      [5.3, -10, 12],
    ],
  },
  {
    key: "B",
    cx: 222,
    color: "var(--series-1)",
    events: [
      [0.8, 10, 24],
      [2.3, -16, 18],
      [3.7, 18, 30],
      [5.0, -4, 14],
    ],
  },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function SeiScene({ active }: { active: boolean }) {
  const { t: d } = useI18n();
  const S = d.explain.sei;
  const t = useLoopTime(LOOP_S, active, 7.5);
  const hourT = Math.min(t, HOUR_S);
  const hourDone = t >= HOUR_S;
  const minutes = Math.floor((hourT / HOUR_S) * 60);
  const clock = hourDone ? "09:00" : `08:${String(minutes).padStart(2, "0")}`;
  const maxEvents = Math.max(...PANELS.map((p) => p.events.length));
  const winner = PANELS.reduce((a, b) => (b.events.length > a.events.length ? b : a));

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-hidden>
        <rect x={0} y={0} width={W} height={H} rx={8} fill="var(--surface)" />

        {/* the shared one-hour window */}
        <text x={12} y={16} fontSize={10} fill="var(--ink-2)">
          08:00
        </text>
        <text x={W - 12} y={16} fontSize={10} fill="var(--ink-2)" textAnchor="end">
          09:00
        </text>
        <rect x={44} y={9} width={W - 88} height={6} rx={3} fill="var(--grid)" />
        <rect x={44} y={9} width={(W - 88) * clamp01(hourT / HOUR_S)} height={6} rx={3} fill="var(--ink-2)" />
        <text x={W / 2} y={28} fontSize={10} fontWeight={600} fill="var(--ink)" textAnchor="middle" className="tabular">
          {clock}
        </text>

        {PANELS.map((p) => {
          const seen = p.events.filter(([te]) => te <= hourT).length;
          const zone = `M ${p.cx - ZONE_R} ${WALL_Y} A ${ZONE_R} ${ZONE_R} 0 0 0 ${p.cx + ZONE_R} ${WALL_Y} Z`;
          const barMax = 108;
          const barW = hourDone ? (barMax * p.events.length) / maxEvents : 0;
          const isWinner = hourDone && p === winner;
          return (
            <g key={p.key}>
              <line x1={p.cx - 60} x2={p.cx + 60} y1={WALL_Y - 3} y2={WALL_Y - 3} stroke="var(--axis)" strokeWidth={2} />
              <path d={zone} fill="var(--zone-fill)" stroke="var(--series-1)" strokeWidth={1} />
              <rect x={p.cx - 16} y={WALL_Y - 8} width={32} height={7} rx={2} fill="var(--ink)" />

              {/* exposure events: a viewer appears facing the screen, then "+1" floats up */}
              {p.events.map(([te, dx, dy], i) => {
                const age = hourT - te;
                if (age < 0 || age > 0.9 || hourDone) return null;
                const fade = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.75;
                return (
                  <g key={i} opacity={clamp01(fade)}>
                    <line x1={p.cx + dx} y1={WALL_Y + dy} x2={p.cx} y2={WALL_Y} stroke="var(--series-2)" strokeWidth={1} strokeDasharray="2 2" />
                    <circle cx={p.cx + dx} cy={WALL_Y + dy} r={4.5} fill="var(--series-2)" stroke="var(--surface)" strokeWidth={1.5} />
                    <text x={p.cx + dx + 7} y={WALL_Y + dy - 6 - age * 10} fontSize={10} fontWeight={700} fill="var(--series-2)">
                      +1
                    </text>
                  </g>
                );
              })}

              <text x={p.cx} y={WALL_Y + ZONE_R + 18} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)">
                {p.key === "A" ? S.screenA : S.screenB}
              </text>
              <text x={p.cx} y={WALL_Y + ZONE_R + 33} textAnchor="middle" fontSize={10} fill="var(--ink-2)" className="tabular">
                {S.events(seen)}
              </text>

              {/* after the hour: SEI bar */}
              <g opacity={hourDone ? 1 : 0} style={{ transition: "opacity 300ms" }}>
                <rect x={p.cx - barMax / 2} y={WALL_Y + ZONE_R + 42} width={barMax} height={10} rx={3} fill="var(--grid)" />
                <rect x={p.cx - barMax / 2} y={WALL_Y + ZONE_R + 42} width={barW} height={10} rx={3} fill={p.color} style={{ transition: "width 500ms ease-out" }} />
                <text x={p.cx} y={WALL_Y + ZONE_R + 68} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink)" className="tabular">
                  {S.result(p.events.length, d.units.perHour)}
                </text>
                {isWinner && (
                  <text x={p.cx} y={WALL_Y + ZONE_R + 82} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--good-text)">
                    {S.ranksHigher}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-col gap-1 text-xs">
        <div className="text-ink font-semibold">{S.formula}</div>
        <div className="text-muted">{S.fair}</div>
      </div>
    </>
  );
}
