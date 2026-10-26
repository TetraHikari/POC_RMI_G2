"use client";

import { useHoverTip, TipRow } from "./core";

export interface BarListRow {
  label: string;
  value: number;
  display: string;
  detail?: string;
}

/** Horizontal bars (one series → one color). Values sit outside the bar end so they never clip. */
export function BarList({ rows, color = "var(--series-1)", unitLabel }: { rows: BarListRow[]; color?: string; unitLabel?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  const { boxRef, show, hide, layer } = useHoverTip();
  return (
    <div ref={boxRef} className="relative flex flex-col gap-0.5" onMouseLeave={hide}>
      {rows.map((r) => (
        <div
          key={r.label}
          className="hover:bg-hover grid grid-cols-[minmax(4.5rem,7rem)_1fr] items-center gap-3 rounded-lg px-1 py-2"
          onMouseMove={(e) => show(e, <TipRow label={r.detail ?? r.label} value={`${r.display}${unitLabel ? ` ${unitLabel}` : ""}`} />)}
        >
          <span className="text-ink-2 truncate text-right text-xs">{r.label}</span>
          <div className="flex items-center gap-2">
            <div className="h-2.5 rounded-full" style={{ width: `${(r.value / max) * 80}%`, background: color, minWidth: 4 }} />
            <span className="text-ink tabular text-xs font-semibold">{r.display}</span>
          </div>
        </div>
      ))}
      {layer}
    </div>
  );
}
