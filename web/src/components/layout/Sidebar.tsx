"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n/I18nProvider";
import { Icon, type IconName } from "@/components/ui/icons";
import { SHARED_KEYS } from "@/lib/filters";

/** Icon rail: logo, one icon + short label per page. Horizontal strip on small screens. */
export function Sidebar() {
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

  const items: { href: string; label: string; icon: IconName }[] = [
    { href: "/", label: t.nav.overview, icon: "grid" },
    { href: "/ranking", label: t.nav.ranking, icon: "trophy" },
    { href: "/trends", label: t.nav.trends, icon: "trend" },
  ];

  return (
    <aside className="bg-surface border-border flex shrink-0 items-center gap-4 border-b px-4 py-3 md:sticky md:top-0 md:h-screen md:w-24 md:flex-col md:gap-8 md:border-r md:border-b-0 md:px-2 md:py-6">
      <Link href={qs ? `/?${qs}` : "/"} aria-label={t.app.name} className="bg-accent text-on-accent flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold tracking-tight">
        RMI
      </Link>
      <nav className="flex gap-1 md:flex-col md:gap-3">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={qs ? `${it.href}?${qs}` : it.href}
              aria-current={active ? "page" : undefined}
              className="group flex items-center rounded-xl md:flex-col md:gap-1.5 md:px-1 md:py-1"
              title={it.label}
            >
              <span
                className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                  active ? "bg-accent text-on-accent shadow-card" : "text-ink-2 border-border group-hover:bg-hover border"
                }`}
              >
                <Icon name={it.icon} />
              </span>
              <span className={`sr-only text-[11px] leading-tight md:not-sr-only md:text-center ${active ? "text-ink font-semibold" : "text-muted group-hover:text-ink-2"}`}>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
