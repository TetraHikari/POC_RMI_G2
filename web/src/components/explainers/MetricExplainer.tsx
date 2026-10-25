"use client";

import { useCallback, useEffect, useLayoutEffect, useId, useRef, useState } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";

import { DwellScene, ExposureScene, FootTrafficScene } from "./scenes";
import { SeiScene } from "./SeiScene";

export type ExplainerKind = "footTraffic" | "dwell" | "exposure" | "sei";

const SCENES = { footTraffic: FootTrafficScene, dwell: DwellScene, exposure: ExposureScene, sei: SeiScene };
const PANEL_W = 320;

/**
 * ⓘ trigger that opens an animated explainer. Hover opens it on mouse devices;
 * tap/click toggles it on touch; Esc or an outside tap closes it.
 */
export function MetricExplainer({ kind }: { kind: ExplainerKind }) {
  const { t } = useI18n();
  const info = t.explain[kind];
  const panelId = useId();
  const Scene = SCENES[kind];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(PANEL_W, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left - 12), window.innerWidth - w - 8);
    const below = r.bottom + 8;
    const h = panel.current?.offsetHeight ?? 320;
    const preferred = below + h > window.innerHeight - 8 ? r.top - h - 8 : below;
    const top = Math.max(8, Math.min(preferred, window.innerHeight - h - 8));
    setPos({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!btn.current?.contains(n) && !panel.current?.contains(n)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const hoverOpen = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        aria-label={`${t.explain.open}: ${info.title}`}
        onClick={() => setOpen((o) => !o)}
        onPointerEnter={hoverOpen}
        onPointerLeave={hoverClose}
        className={`ml-1 inline-flex size-4 items-center justify-center rounded-full border text-[10px] leading-none transition-colors ${
          open ? "border-accent bg-accent text-surface" : "border-axis text-muted hover:border-accent hover:text-accent"
        }`}
      >
        i
      </button>
      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={info.title}
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
          className="border-border bg-raised text-ink fixed z-50 overflow-y-auto rounded-lg border p-3 shadow-xl motion-reduce:animate-none!"
          style={{ maxHeight: "calc(100dvh - 16px)", left: pos.left, top: pos.top, width: `min(${PANEL_W}px, calc(100vw - 16px))`, animation: "explainer-in 160ms ease-out" }}
        >
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <div className="text-sm font-semibold">{info.title}</div>
            <button type="button" onClick={() => setOpen(false)} aria-label={t.explain.close} className="text-muted hover:text-ink -mt-0.5 px-1 text-sm">
              ✕
            </button>
          </div>
          <p className="text-ink-2 mb-2 text-xs leading-relaxed">{info.body}</p>
          <Scene active={open} />
        </div>
      )}
    </>
  );
}
