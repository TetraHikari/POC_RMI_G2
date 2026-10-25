"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SHARED_KEYS } from "@/lib/filters";

export function Sidebar({ source }: { source: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const params = useSearchParams();
  // Carry the shared filters (store, screens, dates, days) from page to page.
  const carried = new URLSearchParams();
  for (const k of SHARED_KEYS) {
    const v = params.get(k);
    if (v) carried.set(k, v);
  }
  const qs = carried.toString();

  const nav = [
    {
      group: t.nav.screens,
      items: [
        { href: "/", label: t.nav.overview },
        { href: "/ranking", label: t.nav.ranking },
        { href: "/trends", label: t.nav.trends },
      ],
    },
  ];

  return (
    <aside className="border-border bg-surface flex shrink-0 flex-col gap-6 border-b px-4 py-5 md:sticky md:top-0 md:h-screen md:w-60 md:border-r md:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-ink text-sm font-semibold">{t.app.name}</div>
          <div className="text-muted text-xs">{t.app.subtitle}</div>
        </div>
        <div className="md:hidden">
          <LanguageToggle />
        </div>
      </div>
      <nav className="flex flex-wrap gap-x-6 gap-y-4 md:flex-col">
        {nav.map((g) => (
          <div key={g.group}>
            <div className="text-muted mb-1 text-xs font-medium tracking-wide uppercase">{g.group}</div>
            <ul className="flex flex-wrap gap-1 md:flex-col">
              {g.items.map((it) => {
                const active = pathname === it.href;
                return (
                  <li key={it.href}>
                    <Link
                      href={qs ? `${it.href}?${qs}` : it.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-2.5 py-1.5 text-sm ${active ? "bg-accent-soft text-ink font-medium" : "text-ink-2 hover:bg-hover"}`}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        {source === "mock" && (
          <p className="text-muted text-xs leading-relaxed">
            {t.sidebar.mockPrefix} <span className="text-ink-2 font-medium">{t.sidebar.mockData}</span>
            {t.sidebar.mockSep} {t.sidebar.mockSuffix}
          </p>
        )}
        <div className="hidden flex-col gap-1.5 md:flex">
          <span className="text-muted text-xs">{t.sidebar.language}</span>
          <LanguageToggle />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-muted text-xs">{t.sidebar.theme}</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
