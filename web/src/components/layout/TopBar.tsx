"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { LogoMark } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** App name on the left; data-source note, language and theme on the right. */
export function TopBar({ source }: { source: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="md:hidden">
          <LogoMark small />
        </span>
        <div className="min-w-0">
          <div className="text-ink truncate text-sm font-semibold">{t.app.name}</div>
          <div className="text-muted truncate text-xs">{t.app.subtitle}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {source === "mock" && (
          <span
            className="border-warning-text/30 bg-warning-text/10 text-warning-text rounded-full border px-2.5 py-1 text-[11px] font-medium"
            title={`${t.sidebar.mockPrefix} ${t.sidebar.mockData}${t.sidebar.mockSep} ${t.sidebar.mockSuffix}`}
          >
            {t.sidebar.mockData}
          </span>
        )}
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </div>
  );
}
