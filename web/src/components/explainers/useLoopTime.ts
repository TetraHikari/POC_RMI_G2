"use client";

import { useEffect, useState } from "react";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * Seconds into a looping timeline, driven by requestAnimationFrame while `active`.
 * With reduced motion it holds on `still` — a frame that tells the whole story.
 */
export function useLoopTime(duration: number, active: boolean, still: number): number {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!active || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(((now - start) / 1000) % duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, duration, reduced]);

  return reduced ? still : t;
}
