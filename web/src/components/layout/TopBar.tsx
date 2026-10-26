"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { LogoMark } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** App name on the left; language and theme on the right. */
export function TopBar() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="md:hidden">
          <LogoMark small />
        </span>
        <div className="text-ink min-w-0 truncate text-sm font-semibold">{t.app.name}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </div>
  );
}
