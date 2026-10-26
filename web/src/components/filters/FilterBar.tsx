"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { DateInput, Field, MultiSelect, Segmented, Select, useQueryState } from "@/components/ui/controls";
import type { DayType } from "@/lib/filters";

interface Props {
  stores: { storeId: number; storeName: string }[];
  screens: { screenId: number; storeId: number; label: string }[];
  store: number | null;
  selectedScreens: number[]; // explicit picks only; [] = all
  from: string;
  to: string;
  days: DayType;
  min: string;
  max: string;
}

/** One filter row above everything it scopes; state lives in the URL. */
export function FilterBar(p: Props) {
  const { t } = useI18n();
  const { set, pending } = useQueryState();
  const pool = p.screens.filter((s) => p.store === null || s.storeId === p.store);
  const multiStore = p.stores.length > 1; // single-branch POC: no store picker

  return (
    <div className={`border-border bg-surface shadow-card grid grid-cols-1 gap-3 rounded-2xl border p-4 transition-opacity sm:grid-cols-2 ${multiStore ? "lg:grid-cols-[minmax(8rem,1fr)_minmax(12rem,2fr)_auto_auto]" : "lg:grid-cols-[minmax(12rem,2fr)_auto_auto]"} ${pending ? "opacity-60" : ""}`}>
      {multiStore && (
        <Field label={t.filters.store}>
          <Select
            value={p.store ?? 0}
            options={[{ value: 0, label: t.filters.allStores }, ...p.stores.map((s) => ({ value: s.storeId, label: s.storeName }))]}
            onChange={(v) => set({ store: v ? String(v) : null, screens: null })}
          />
        </Field>
      )}
      <Field label={t.filters.screens}>
        <MultiSelect
          allLabel={t.filters.allScreens}
          selected={p.selectedScreens}
          options={pool.map((s) => ({ value: s.screenId, label: s.label }))}
          onChange={(v) => set({ screens: v.join(",") || null })}
        />
      </Field>
      <Field label={t.filters.dates}>
        <div className="flex items-center gap-1.5">
          <DateInput ariaLabel={t.filters.from} value={p.from} min={p.min} max={p.to} onChange={(v) => set({ from: v === p.min ? null : v })} />
          <span className="text-muted text-xs">–</span>
          <DateInput ariaLabel={t.filters.to} value={p.to} min={p.from} max={p.max} onChange={(v) => set({ to: v === p.max ? null : v })} />
        </div>
      </Field>
      <Field label={t.filters.days}>
        <Segmented<DayType>
          ariaLabel={t.filters.days}
          value={p.days}
          options={[
            { value: "all", label: t.filters.all },
            { value: "weekday", label: t.filters.weekday },
            { value: "weekend", label: t.filters.weekend },
          ]}
          onChange={(v) => set({ days: v === "all" ? null : v })}
        />
      </Field>
    </div>
  );
}
