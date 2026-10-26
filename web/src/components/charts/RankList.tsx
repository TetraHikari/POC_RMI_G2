"use client";

import { TipRow, useHoverTip } from "./core";

export interface RankListRow {
  key: string | number;
  rank: number;
  label: string;
  sublabel?: string;
  value: number;
  display: string;
  detail?: string;
  color: string;
}

/** Ranked rows (label + value) with a slim bar under each, scaled to the largest value. */
export function RankList({ rows, unitLabel, barColor = "var(--series-1)" }: { rows: RankListRow[]; unitLabel?: string; barColor?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  const { boxRef, show, hide, layer } = useHoverTip();
  return (
    <div ref={boxRef} className="relative flex flex-col gap-1" onMouseLeave={hide}>
      {rows.map((r) => (
        <div
          key={r.key}
          className="hover:bg-hover flex items-center gap-3 rounded-xl px-2 py-2.5"
          onMouseMove={(e) => show(e, <TipRow color={r.color} label={r.label} value={`${r.display}${unitLabel ? ` ${unitLabel}` : ""}`} />)}
        >
          <span className="bg-accent-soft text-accent tabular flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold">#{r.rank}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-ink inline-flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold">
                <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: r.color }} />
                {r.label}
              </span>
              <span className="text-ink tabular text-sm font-bold">
                {r.display}
                {unitLabel && <span className="text-muted ml-0.5 text-xs font-medium">{unitLabel}</span>}
              </span>
            </div>
            <div className="text-muted mt-0.5 flex justify-between gap-3 text-xs">
              <span className="truncate">{r.sublabel}</span>
              {r.detail && <span className="tabular shrink-0">{r.detail}</span>}
            </div>
            <div className="bg-hover mt-2 h-1.5 overflow-hidden rounded-full">
              <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: barColor }} />
            </div>
          </div>
        </div>
      ))}
      {layer}
    </div>
  );
}
