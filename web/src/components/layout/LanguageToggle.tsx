"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { PillGroup } from "@/components/ui/controls";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(l: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <PillGroup<Locale>
      variant="pill"
      ariaLabel={t.sidebar.language}
      value={locale}
      options={LOCALES.map((l) => ({ value: l.value, label: l.label, lang: l.value }))}
      onChange={pick}
      className={`transition-opacity ${pending ? "opacity-70" : ""}`}
    />
  );
}
