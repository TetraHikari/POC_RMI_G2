"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export const AXIS = { stroke: "var(--axis)", tick: { fill: "var(--muted)", fontSize: 12 }, tickLine: { stroke: "var(--axis)" } };

/** Measure a container's width for SVG charts. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Tooltip box shared by Recharts and hand-rolled SVG charts. */
export function TipBox({ children }: { children: ReactNode }) {
  return <div className="border-border bg-raised text-ink pointer-events-none rounded-xl border px-3 py-2 text-xs shadow-lg">{children}</div>;
}

export function TipRow({ color, label, value }: { color?: string; label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-px">
      {color && <span className="inline-block size-2 rounded-full" style={{ background: color }} />}
      <span className="text-ink-2">{label}</span>
      <span className="tabular ml-auto pl-3 font-medium">{value}</span>
    </div>
  );
}

/** Floating tooltip for SVG charts: wrap the chart, call show(e, content) on hover. */
export function useHoverTip() {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent, content: ReactNode) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, content });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  const layer = tip ? (
    <div className="absolute z-10" style={{ left: tip.x + 12, top: tip.y + 12, maxWidth: 260 }}>
      <TipBox>{tip.content}</TipBox>
    </div>
  ) : null;

  return { boxRef, show, hide, layer };
}

/** Linear scale helper. */
export function scale(d0: number, d1: number, r0: number, r1: number) {
  const k = (r1 - r0) / (d1 - d0 || 1);
  return (v: number) => r0 + (v - d0) * k;
}

/** "Nice" ticks for an axis from 0..max. */
export function niceTicks(max: number, count = 5): number[] {
  if (!(max > 0)) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}
