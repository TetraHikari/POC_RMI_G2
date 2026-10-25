"use client";

import { useI18n } from "@/components/i18n/I18nProvider";

import { TipRow, useHoverTip, useWidth } from "./core";
import { formatter, type FmtKey } from "@/lib/format";

const STEPS = 7;
const stepColor = (i: number) => `var(--seq-${i})`;

/** Binned sequential heatmap (one hue, light → dark) with a scale legend. */
export function Heatmap({
  rows,
  cols,
  values,
  fmtKey,
  valueLabel,
}: {
  rows: string[];
  cols: string[];
  values: (number | null)[][];
  fmtKey: FmtKey;
  valueLabel: string;
}) {
  const { locale, t } = useI18n();
  const fmt = formatter(fmtKey, locale);
  const [ref, width] = useWidth<HTMLDivElement>();
  const { boxRef, show, hide, layer } = useHoverTip();
  const flat = values.flat().filter((v): v is number => v !== null && Number.isFinite(v));
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  const bin = (v: number) => Math.min(STEPS - 1, Math.floor(((v - lo) / (hi - lo || 1)) * STEPS));
  const labelW = 40;
  const cellW = Math.max(14, (width - labelW) / cols.length);
  const cellH = 26;
  const height = rows.length * cellH + 22;

  return (
    <div ref={ref}>
      <div ref={boxRef} className="relative" onMouseLeave={hide}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={valueLabel}>
            {rows.map((r, ri) => (
              <g key={r}>
                <text x={labelW - 8} y={ri * cellH + cellH / 2 + 4} textAnchor="end" fontSize={12} fill="var(--muted)">
                  {r}
                </text>
                {cols.map((c, ci) => {
                  const v = values[ri][ci];
                  return (
                    <rect
                      key={c}
                      x={labelW + ci * cellW + 1}
                      y={ri * cellH + 1}
                      width={cellW - 2}
                      height={cellH - 2}
                      rx={2}
                      fill={v === null ? "var(--grid)" : stepColor(bin(v))}
                      onMouseMove={(e) => show(e, <TipRow label={`${r} ${c}`} value={v === null ? t.common.noDataCell : fmt(v)} />)}
                    />
                  );
                })}
              </g>
            ))}
            {cols.map((c, ci) =>
              ci % Math.ceil(36 / cellW) === 0 ? (
                <text key={c} x={labelW + ci * cellW + cellW / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="var(--muted)" className="tabular">
                  {c}
                </text>
              ) : null,
            )}
          </svg>
        )}
        {layer}
      </div>
      <div className="text-muted mt-2 flex items-center gap-2 text-xs">
        <span className="tabular">{flat.length ? fmt(lo) : ""}</span>
        <div className="flex">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className="inline-block h-2.5 w-6 first:rounded-l last:rounded-r" style={{ background: stepColor(i) }} />
          ))}
        </div>
        <span className="tabular">{flat.length ? fmt(hi) : ""}</span>
        <span className="ml-1">{valueLabel}</span>
      </div>
    </div>
  );
}
