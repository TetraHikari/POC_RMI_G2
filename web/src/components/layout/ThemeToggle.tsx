"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { PillGroup } from "@/components/ui/controls";

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

  return <PillGroup<Mode> variant="pill" ariaLabel={t.sidebar.theme} value={mode} options={MODES.map((m) => ({ value: m, label: t.sidebar.themes[m] }))} onChange={pick} />;
}
