import { FilterBar } from "@/components/filters/FilterBar";
import type { ScreenContext } from "@/lib/page-context";

/** Server wrapper: maps the loaded page context onto the client filter bar. */
export function ScreenFilters({ ctx }: { ctx: ScreenContext }) {
  const { filters: f } = ctx;
  return (
    <FilterBar
      stores={ctx.stores}
      screens={ctx.screens.map((s) => ({ screenId: s.screenId, storeId: s.storeId, label: s.label }))}
      store={f.store}
      selectedScreens={f.explicitScreens ? f.screenIds : []}
      from={f.from}
      to={f.to}
      days={f.days}
      min={ctx.range.min}
      max={ctx.range.max}
    />
  );
}
