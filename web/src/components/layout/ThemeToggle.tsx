"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";

type Mode = "system" | "light" | "dark";
const MODES: Mode[] = ["system", "light", "dark"];

export function ThemeToggle() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rmi-theme");
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {}
  }, []);

  function pick(m: Mode) {
    setMode(m);
    const root = document.documentElement;
    if (m === "system") delete root.dataset.theme;
    else root.dataset.theme = m;
    try {
      if (m === "system") localStorage.removeItem("rmi-theme");
      else localStorage.setItem("rmi-theme", m);
    } catch {}
  }

  return (
    <div role="radiogroup" aria-label={t.sidebar.theme} className="border-border bg-surface inline-flex w-fit rounded-full border p-0.5 text-xs">
      {MODES.map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          onClick={() => pick(m)}
          className={`rounded-full transition-colors duration-200 px-2 py-1 ${mode === m ? "bg-accent text-on-accent font-medium" : "text-muted hover:text-ink-2"}`}
        >
          {t.sidebar.themes[m]}
        </button>
      ))}
    </div>
  );
}
