import "server-only";

import { getDataSource } from "@/lib/data";
import { applyFilters, dataRange, parseFilters, type SearchParams } from "@/lib/filters";
import { screenLabel, tName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

/** Everything a page scoped by the shared filter bar needs, with display names in the current language. */
export async function loadScreenContext(searchParams: Promise<SearchParams>) {
  const [sp, { locale, t }] = await Promise.all([searchParams, getI18n()]);
  const src = getDataSource();
  const [rawStores, rawScreens, hourlyAll] = await Promise.all([src.stores(), src.screens(), src.hourly()]);
  const stores = rawStores.map((s) => ({ ...s, storeName: tName(t.names.stores, s.storeName) }));
  const screens = rawScreens.map((s) => ({ ...s, label: screenLabel(t, s), iabZone: tName(t.names.zones, s.iabZone) }));
  const filters = parseFilters(sp, screens, hourlyAll);
  const hourly = applyFilters(hourlyAll, filters);
  const labels = new Map(screens.map((s) => [s.screenId, s.label]));
  return { sp, src, locale, t, stores, screens, labels, hourly, filters, range: dataRange(hourlyAll) };
}

export type ScreenContext = Awaited<ReturnType<typeof loadScreenContext>>;
