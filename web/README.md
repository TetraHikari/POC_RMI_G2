# Dashboard (Next.js)

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Recharts. Runs on deterministic
mock data until the PostgreSQL pipeline exists.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm run lint
```

## Pages

| Route | What it shows |
|---|---|
| `/` | Overview — KPI tiles, SEI by screen, exposure by hour of day |
| `/ranking` | SEI ranking with 95% bootstrap intervals, drivers |
| `/trends` | Daily lines per screen for a chosen metric, hour × weekday heatmap |

All filters live in the URL (`?screens=1,3&from=2026-10-12&days=weekend`), so views
are shareable and the shared filters follow you between pages.

## Structure

```
src/
  app/                      Routes (server components: load data, compute, render)
    layout.tsx              Shell: sidebar + theme
    page.tsx                Overview
    ranking/ trends/
    globals.css             Design tokens (light + dark) mapped into Tailwind
  components/
    layout/                 Sidebar, ThemeToggle
    filters/                FilterBar (shared row), ScreenFilters, ParamControls (URL-bound)
    ui/                     primitives (Card, Kpi, StatusBadge, DataTable, TableView…), controls
    charts/                 BarList, DotRangePlot, LineSeriesChart, Heatmap,
                            core (tooltip, scales, sizing)
  lib/
    data/types.ts           Row shapes = the planned Postgres tables/views + DataSource interface
    data/mock.ts            Seeded mock DataSource
    data/index.ts           getDataSource() — picks the backend from RMI_DATA_SOURCE
    analytics.ts            SEI + CI, H1 scoring & targets, H2 verdict, track summaries
    filters.ts              URL ⇄ filter parsing and application
    page-context.ts         Loads screens/hourly + filters for filter-scoped pages
    i18n/                   en.ts, th.ts dictionaries; locale helpers; server.ts (cookie)
    colors.ts format.ts time.ts rng.ts
```

## Languages (Thai / English)

Switch with the ไทย / EN toggle in the sidebar. The choice is stored in the `rmi-locale` cookie,
so pages render server-side in the chosen language (no URL prefix).

- Strings: `src/lib/i18n/en.ts` (source of truth) and `src/lib/i18n/th.ts` — `th` is type-checked
  against `en`, so a missing Thai key fails `tsc`.
- Server components: `const { t, locale } = await getI18n()` (`lib/i18n/server.ts`).
- Client components: `const { t, locale } = useI18n()` (`components/i18n/I18nProvider.tsx`).
- Dates use `Intl` (Thai shows the Buddhist-era year, e.g. 24 ต.ค. 2569). Store / screen / zone
  names from the data source are translated via `names` in the dictionaries when a mapping exists.
- Default language: `DEFAULT_LOCALE` in `lib/i18n/index.ts`.

## Connecting PostgreSQL later

1. Add `src/lib/data/postgres.ts` exporting a `DataSource` (same method names and row shapes
   as `types.ts`), backed by SQL views such as `v_hourly_screen_metrics`.
2. Register it in `src/lib/data/index.ts`.
3. Run with `RMI_DATA_SOURCE=postgres`.

Pages, charts and `analytics.ts` don't change.

## Notes

- Validation (H1 accuracy, H2 rank check, clip explorer) is **not on the dashboard**. The data
  layer (`clipScores`, `errors`, `agreement`) and the scoring in `lib/analytics.ts` stay for a
  possible internal "model check" page. H1 targets (`TARGETS`) are placeholders.
- Colors are CSS variables (`--series-1…8`, `--seq-0…6`); dark mode uses its own validated
  steps, follows the OS, and can be overridden from the sidebar toggle.
