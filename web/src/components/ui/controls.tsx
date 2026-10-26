"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";

/** Returns a setter that patches URL query params (null/"" removes a key) without scrolling. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return { params, set, pending };
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-muted text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "border-border bg-surface text-ink h-9 rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={inputCls}
      value={String(value)}
      onChange={(e) => {
        const opt = options.find((o) => String(o.value) === e.target.value);
        if (opt) onChange(opt.value);
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DateInput({ value, min, max, onChange, ariaLabel }: { value: string; min: string; max: string; onChange: (v: string) => void; ariaLabel: string }) {
  return <input type="date" aria-label={ariaLabel} className={`${inputCls} tabular`} value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} />;
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="border-border bg-surface inline-flex h-9 w-fit max-w-full overflow-x-auto rounded-xl border p-0.5 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-lg px-3 text-sm whitespace-nowrap ${value === o.value ? "bg-accent text-on-accent font-medium" : "text-ink-2 hover:bg-hover"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Checkbox popover. An empty selection means "all". */
export function MultiSelect({
  selected,
  options,
  onChange,
  allLabel,
}: {
  selected: number[];
  options: { value: number; label: string }[];
  onChange: (v: number[]) => void;
  allLabel: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const summary =
    selected.length === 0 ? allLabel : selected.length <= 2 ? options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(", ") : t.filters.selected(selected.length);

  function toggle(v: number) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v].sort((a, b) => a - b));
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${inputCls} flex w-full items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${selected.length ? "" : "text-muted"}`}>{summary}</span>
        <span aria-hidden className="text-muted text-xs">
          ▾
        </span>
      </button>
      {open && (
        <div className="border-border bg-raised absolute z-20 mt-1 w-full min-w-56 rounded-xl border p-1 shadow-lg">
          {options.map((o) => (
            <label key={o.value} className="text-ink hover:bg-hover flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
              <input type="checkbox" className="accent-[var(--accent)]" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="text-accent hover:bg-hover mt-1 w-full rounded px-2 py-1.5 text-left text-xs">
              {t.filters.clearAll}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
