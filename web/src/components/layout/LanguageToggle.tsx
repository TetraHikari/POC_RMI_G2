"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(l: Locale) {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div role="radiogroup" aria-label={t.sidebar.language} className={`border-border inline-flex w-fit rounded-md border p-0.5 text-xs ${pending ? "opacity-60" : ""}`}>
      {LOCALES.map((l) => (
        <button
          key={l.value}
          role="radio"
          aria-checked={locale === l.value}
          lang={l.value}
          onClick={() => pick(l.value)}
          className={`rounded px-2.5 py-1 ${locale === l.value ? "bg-accent-soft text-ink font-medium" : "text-muted hover:text-ink-2"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
