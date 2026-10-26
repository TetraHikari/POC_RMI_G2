"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

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
  "border-border bg-surface text-ink h-9 rounded-xl border px-3 text-sm transition-[border-color,box-shadow] duration-200 outline-none hover:border-[var(--axis)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

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

type PillVariant = "segment" | "pill";

const PILL_STYLES: Record<PillVariant, { group: string; item: string; thumb: string }> = {
  segment: {
    group: "border-border bg-surface h-9 rounded-xl border p-0.5 text-sm",
    item: "rounded-lg px-3",
    thumb: "rounded-lg",
  },
  pill: {
    group: "border-border bg-surface rounded-full border p-0.5 text-xs",
    item: "rounded-full px-2.5 py-1",
    thumb: "rounded-full",
  },
};

/**
 * Radio group whose green highlight slides to the picked option.
 * The highlight moves on click (before slow work like a URL update or refresh finishes) and
 * re-measures when labels change width (e.g. switching language).
 */
export function PillGroup<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  variant = "segment",
  className = "",
}: {
  value: T;
  options: { value: T; label: string; lang?: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
  variant?: PillVariant;
  className?: string;
}) {
  const st = PILL_STYLES[variant];
  const [shown, setShown] = useState(value);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false); // no slide on first paint
  const group = useRef<HTMLDivElement>(null);
  const items = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => setShown(value), [value]);

  useLayoutEffect(() => {
    const measure = () => {
      const el = items.current.get(shown);
      if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (group.current) ro.observe(group.current);
    items.current.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [shown, options]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={group} role="radiogroup" aria-label={ariaLabel} className={`relative isolate inline-flex w-fit max-w-full overflow-x-auto [scrollbar-width:none] ${st.group} ${className}`}>
      {thumb && (
        <span
          aria-hidden
          className={`bg-accent shadow-card absolute inset-y-0.5 -z-10 ${st.thumb} ${ready ? "transition-[left,width] duration-300 ease-[var(--ease-out)]" : ""}`}
          style={{ left: thumb.x, width: thumb.w }}
        />
      )}
      {options.map((o) => {
        const on = shown === o.value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              if (el) items.current.set(o.value, el);
              else items.current.delete(o.value);
            }}
            type="button"
            role="radio"
            aria-checked={on}
            lang={o.lang}
            onClick={() => {
              if (on) return;
              setShown(o.value);
              onChange(o.value);
            }}
            className={`shrink-0 whitespace-nowrap transition-colors duration-300 ${st.item} ${on ? "text-on-accent font-medium" : "text-muted hover:text-ink-2"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string }) {
  return <PillGroup value={value} options={options} onChange={onChange} ariaLabel={ariaLabel} />;
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
        <span aria-hidden className={`text-muted text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="anim-pop border-border bg-raised absolute z-20 mt-1 w-full min-w-56 rounded-xl border p-1 shadow-lg">
          {options.map((o) => (
            <label key={o.value} className="text-ink hover:bg-hover flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors">
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
