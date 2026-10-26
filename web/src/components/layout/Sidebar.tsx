"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/i18n/I18nProvider";
import { Icon, type IconName } from "@/components/ui/icons";
import { SHARED_KEYS } from "@/lib/filters";

/** Page navigation: icon rail on desktop, fixed bottom tab bar on phones. */
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
  const href = (path: string) => (qs ? `${path}?${qs}` : path);

  const items: { href: string; label: string; icon: IconName }[] = [
    { href: "/", label: t.nav.overview, icon: "grid" },
    { href: "/ranking", label: t.nav.ranking, icon: "trophy" },
    { href: "/trends", label: t.nav.trends, icon: "trend" },
  ];

  return (
    <>
      <aside className="bg-surface border-border sticky top-0 hidden h-screen w-24 shrink-0 flex-col items-center gap-8 border-r px-2 py-6 md:flex">
        <Link href={href("/")} aria-label={t.app.name}>
          <LogoMark />
        </Link>
        <nav className="flex flex-col gap-3">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link key={it.href} href={href(it.href)} aria-current={active ? "page" : undefined} className="group flex flex-col items-center gap-1.5 rounded-xl px-1 py-1">
                <span
                  className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                    active ? "bg-accent text-on-accent shadow-card" : "text-ink-2 border-border group-hover:bg-hover border"
                  }`}
                >
                  <Icon name={it.icon} />
                </span>
                <span className={`text-center text-[11px] leading-tight transition-colors ${active ? "text-ink font-semibold" : "text-muted group-hover:text-ink-2"}`}>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav
        aria-label={t.app.name}
        className="bg-surface/95 border-border fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
      >
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={href(it.href)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] transition-colors duration-200 ${active ? "text-accent font-semibold" : "text-muted"}`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-300 ${active ? "bg-accent-soft scale-100" : "scale-90"}`}>
                <Icon name={it.icon} size={20} />
              </span>
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function LogoMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`bg-accent text-on-accent flex shrink-0 items-center justify-center font-bold tracking-tight ${small ? "size-9 rounded-lg text-[11px]" : "size-10 rounded-xl text-xs"}`}
    >
      RMI
    </span>
  );
}
