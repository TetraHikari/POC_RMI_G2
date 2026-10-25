/** Shared filters live in the URL so they survive page switches and links can be shared. */
import { dayOfWeek, isoDate } from "@/lib/time";
import type { HourlyMetric, Screen } from "@/lib/data/types";

export type SearchParams = Record<string, string | string[] | undefined>;
export type DayType = "all" | "weekday" | "weekend";

export interface Filters {
  store: number | null;
  screenIds: number[]; // resolved: never empty
  explicitScreens: boolean;
  from: string;
  to: string;
  days: DayType;
}

/** Query keys owned by the shared filter bar; navigation carries these between pages. */
export const SHARED_KEYS = ["store", "screens", "from", "to", "days"] as const;

export const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

export function parseFilters(sp: SearchParams, screens: Screen[], hourly: HourlyMetric[]): Filters {
  const dates = hourly.map((h) => isoDate(h.hourStart)).sort();
  const lo = dates[0];
  const hi = dates[dates.length - 1];
  const storeRaw = Number(one(sp.store));
  const store = screens.some((s) => s.storeId === storeRaw) ? storeRaw : null;
  const pool = screens.filter((s) => store === null || s.storeId === store).map((s) => s.screenId);
  const picked = (one(sp.screens) ?? "")
    .split(",")
    .map(Number)
    .filter((id) => pool.includes(id));
  const clampDate = (d: string | undefined, fallback: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= lo && d <= hi ? d : fallback);
  let from = clampDate(one(sp.from), lo);
  let to = clampDate(one(sp.to), hi);
  if (from > to) [from, to] = [to, from];
  const daysRaw = one(sp.days);
  const days: DayType = daysRaw === "weekday" || daysRaw === "weekend" ? daysRaw : "all";
  return { store, screenIds: picked.length ? picked : pool, explicitScreens: picked.length > 0, from, to, days };
}

export function applyFilters(hourly: HourlyMetric[], f: Filters): HourlyMetric[] {
  const ids = new Set(f.screenIds);
  return hourly.filter((h) => {
    const d = isoDate(h.hourStart);
    if (!ids.has(h.screenId) || d < f.from || d > f.to) return false;
    if (f.days === "all") return true;
    const weekend = dayOfWeek(h.hourStart) >= 5;
    return f.days === "weekend" ? weekend : !weekend;
  });
}

export function dataRange(hourly: HourlyMetric[]): { min: string; max: string } {
  const dates = hourly.map((h) => isoDate(h.hourStart)).sort();
  return { min: dates[0], max: dates[dates.length - 1] };
}
