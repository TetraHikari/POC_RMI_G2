"use client";

import { useI18n } from "@/components/i18n/I18nProvider";

import { niceTicks, scale, TipRow, useHoverTip, useWidth } from "./core";
import { formatter, type FmtKey } from "@/lib/format";

export interface DotRangeSeries {
  key: string;
  label: string;
  color: string;
  shape: "dot" | "diamond";
}

export interface DotRangeRow {
  label: string;
  values: Record<string, { value: number; low?: number; high?: number }>;
  note?: string;
}

/** Dot + interval rows (e.g. SEI with 95% CI). Rows render top → bottom in the order given. */
export function DotRangePlot({ rows, series, xLabel, fmtKey = "1dp" }: { rows: DotRangeRow[]; series: DotRangeSeries[]; xLabel: string; fmtKey?: FmtKey }) {
  const { locale, t } = useI18n();
  const fmt = formatter(fmtKey, locale);
  const [ref, width] = useWidth<HTMLDivElement>();
  const { boxRef, show, hide, layer } = useHoverTip();
  const labelW = Math.min(150, Math.max(100, width * 0.22));
  const rowH = 40;
  const top = 8;
  const axisH = 44;
  const height = top + rows.length * rowH + axisH;
  const max = Math.max(...rows.flatMap((r) => Object.values(r.values).map((v) => v.high ?? v.value)), 0);
  const ticks = niceTicks(max);
  const x = scale(0, ticks[ticks.length - 1], labelW + 8, Math.max(labelW + 50, width - 16));

  return (
    <div ref={ref} className="w-full">
      <div ref={boxRef} className="relative" onMouseLeave={hide}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={xLabel}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={top} y2={top + rows.length * rowH} stroke="var(--grid)" />
                <text x={x(t)} y={top + rows.length * rowH + 16} textAnchor="middle" fontSize={12} fill="var(--muted)" className="tabular">
                  {t}
                </text>
              </g>
            ))}
            <line x1={labelW + 8} x2={width - 16} y1={top + rows.length * rowH} y2={top + rows.length * rowH} stroke="var(--axis)" />
            <text x={(labelW + width) / 2} y={height - 6} textAnchor="middle" fontSize={12} fill="var(--ink-2)">
              {xLabel}
            </text>
            {rows.map((r, i) => {
              const cy = top + i * rowH + rowH / 2;
              return (
                <g
                  key={r.label}
                  className="anim-fade"
                  style={{ ["--i" as string]: 6 + i * 8 }}
                  onMouseMove={(e) =>
                    show(
                      e,
                      <>
                        <div className="mb-1 font-medium">{r.label}</div>
                        {series.map((s) => {
                          const v = r.values[s.key];
                          if (!v) return null;
                          const ci = v.low !== undefined ? ` (${t.common.ci95} ${fmt(v.low)}–${fmt(v.high!)})` : "";
                          return <TipRow key={s.key} color={s.color} label={s.label} value={`${fmt(v.value)}${ci}`} />;
                        })}
                        {r.note && <div className="text-muted mt-1">{r.note}</div>}
                      </>,
                    )
                  }
                >
                  <rect x={0} y={cy - rowH / 2} width={width} height={rowH} fill="transparent" />
                  <text x={labelW} y={cy + 4} textAnchor="end" fontSize={12} fill="var(--ink-2)">
                    {r.label}
                  </text>
                  {series.map((s, si) => {
                    const v = r.values[s.key];
                    if (!v) return null;
                    const dy = (si - (series.length - 1) / 2) * 8; // nudge series apart so marks don't hide each other
                    return (
                      <g key={s.key}>
                        {v.low !== undefined && v.high !== undefined && (
                          <line x1={x(v.low)} x2={x(v.high)} y1={cy + dy} y2={cy + dy} stroke={s.color} strokeWidth={2} strokeLinecap="round" />
                        )}
                        {s.shape === "dot" ? (
                          <circle cx={x(v.value)} cy={cy + dy} r={5.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} style={{ transition: "cx 0.5s var(--ease-out)" }} />
                        ) : (
                          <rect x={x(v.value) - 5} y={cy + dy - 5} width={10} height={10} transform={`rotate(45 ${x(v.value)} ${cy + dy})`} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        )}
        {layer}
      </div>
    </div>
  );
}
