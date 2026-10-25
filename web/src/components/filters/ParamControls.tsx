"use client";

import { Field, MultiSelect, Segmented, Select, useQueryState } from "@/components/ui/controls";

/** Page-specific controls bound to a single URL query param. */

export function ParamSegmented({
  param,
  value,
  fallback,
  options,
  ariaLabel,
  label,
}: {
  param: string;
  value: string;
  fallback: string;
  options: { value: string; label: string }[];
  ariaLabel: string;
  label?: string;
}) {
  const { set } = useQueryState();
  const control = <Segmented ariaLabel={ariaLabel} value={value} options={options} onChange={(v) => set({ [param]: v === fallback ? null : v })} />;
  return label ? <Field label={label}>{control}</Field> : control;
}

export function ParamSelect<T extends string | number>({
  param,
  value,
  options,
  ariaLabel,
  label,
  extra,
}: {
  param: string;
  value: T;
  options: { value: T; label: string }[];
  ariaLabel?: string;
  label?: string;
  /** Other params to reset when this one changes (e.g. clip when screen changes). */
  extra?: Record<string, string | null>;
}) {
  const { set } = useQueryState();
  const control = <Select ariaLabel={ariaLabel ?? label} value={value} options={options} onChange={(v) => set({ [param]: String(v), ...extra })} />;
  return label ? <Field label={label}>{control}</Field> : control;
}

export function ParamMultiSelect({ param, selected, options, label, allLabel }: { param: string; selected: number[]; options: { value: number; label: string }[]; label: string; allLabel: string }) {
  const { set } = useQueryState();
  return (
    <Field label={label}>
      <MultiSelect allLabel={allLabel} selected={selected} options={options} onChange={(v) => set({ [param]: v.join(",") || null })} />
    </Field>
  );
}
