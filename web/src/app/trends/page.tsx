import { Heatmap } from "@/components/charts/Heatmap";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { ParamSegmented, ParamSelect } from "@/components/filters/ParamControls";
import { ScreenFilters } from "@/components/filters/ScreenFilters";
import { ChartCard, DataTable, Empty, Legend, LegendItem, PageHeader, Section, TableView } from "@/components/ui/primitives";
import { groupBy, median } from "@/lib/analytics";
import { screenColor } from "@/lib/colors";
import type { HourlyMetric } from "@/lib/data/types";
import { one, type SearchParams } from "@/lib/filters";
import { formatter, type FmtKey } from "@/lib/format";
import { loadScreenContext } from "@/lib/page-context";
import { dayOfWeek, hourOf, isoDate, weekdays } from "@/lib/time";

const METRIC_FMT = { sei: "1dp", ft: "int", rate: "pct1", dwell: "s1" } as const satisfies Record<string, FmtKey>;
type MetricKey = keyof typeof METRIC_FMT;

/** Aggregate a group of hourly rows into one value for the chosen metric. */
function aggregate(rows: HourlyMetric[], m: MetricKey): number {
  if (m === "rate") {
    const ft = rows.reduce((a, h) => a + h.footTraffic, 0);
    return ft ? rows.reduce((a, h) => a + h.exposureEvents, 0) / ft : 0; // ratio of sums, not mean of ratios
  }
  if (m === "dwell") return median(rows.map((h) => h.medianDwellS));
  const vals = rows.map((h) => (m === "sei" ? h.exposureEvents : h.footTraffic));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await loadScreenContext(searchParams);
  const { hourly, screens, labels, filters: f, sp, t, locale } = ctx;
  const allIds = screens.map((s) => s.screenId);

  const metricRaw = one(sp.metric);
  const metric: MetricKey = metricRaw && metricRaw in METRIC_FMT ? (metricRaw as MetricKey) : "sei";
  const fmtKey = METRIC_FMT[metric];
  const metricLabel = t.trends.metrics[metric];
  const heatRaw = Number(one(sp.heat));
  const heatScreen = f.screenIds.includes(heatRaw) ? heatRaw : f.screenIds[0];

  const header = (
    <>
      <ScreenFilters ctx={ctx} />
      <PageHeader title={t.trends.title} />
      <ParamSegmented
        param="metric"
        value={metric}
        fallback="sei"
        ariaLabel={t.trends.metric}
        options={(Object.keys(METRIC_FMT) as MetricKey[]).map((value) => ({ value, label: t.trends.metrics[value] }))}
      />
    </>
  );
  if (!hourly.length)
    return (
      <>
        {header}
        <div className="mt-4">
          <Empty>{t.common.noData}</Empty>
        </div>
      </>
    );

  const daily = [...groupBy(hourly, (h) => isoDate(h.hourStart))]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, g]) => {
      const row: Record<string, number | string> = { x: day };
      for (const [sid, gs] of groupBy(g, (h) => h.screenId)) row[`s${sid}`] = aggregate(gs, metric);
      return row;
    });
  const lineSeries = f.screenIds.map((id) => ({ key: `s${id}`, label: labels.get(id)!, color: screenColor(id, allIds) }));

  const heatRows = hourly.filter((h) => h.screenId === heatScreen);
  const hours = [...new Set(heatRows.map((h) => hourOf(h.hourStart)))].sort((a, b) => a - b);
  const cell = groupBy(heatRows, (h) => `${dayOfWeek(h.hourStart)}-${hourOf(h.hourStart)}`);
  const days = [...new Set(heatRows.map((h) => dayOfWeek(h.hourStart)))].sort();
  const values = days.map((d) => hours.map((h) => (cell.has(`${d}-${h}`) ? aggregate(cell.get(`${d}-${h}`)!, metric) : null)));
  const dayNames = weekdays(locale);
  const fmt = formatter(fmtKey, locale);
  const fmtDayCell = formatter("day", locale);

  return (
    <>
      {header}
      <Section title={t.trends.byDay(metricLabel)}>
        <ChartCard>
          <Legend>
            {lineSeries.map((l) => (
              <LegendItem key={l.key} color={l.color} label={l.label} shape="line" />
            ))}
          </Legend>
          <LineSeriesChart data={daily} series={lineSeries} xFmt="day" yFmt={fmtKey} height={340} markers />
        </ChartCard>
      </Section>

      <Section
        title={t.trends.heatmap}
        actions={
          <div className="w-56">
            <ParamSelect param="heat" value={heatScreen} options={f.screenIds.map((id) => ({ value: id, label: labels.get(id)! }))} ariaLabel={t.trends.heatScreen} />
          </div>
        }
      >
        <ChartCard>
          <Heatmap
            rows={days.map((d) => dayNames[d])}
            cols={hours.map((h) => `${String(h).padStart(2, "0")}:00`)}
            values={values}
            fmtKey={fmtKey}
            valueLabel={`${metricLabel} · ${labels.get(heatScreen)}`}
          />
        </ChartCard>
      </Section>

      <TableView label={t.common.tableView}>
        <DataTable
          rows={daily}
          columns={[
            { key: "x", header: t.trends.day, render: (r) => fmtDayCell(r.x) },
            ...lineSeries.map((l) => ({
              key: l.key,
              header: l.label,
              render: (r: Record<string, number | string>) => (r[l.key] === undefined ? "–" : fmt(r[l.key])),
              align: "right" as const,
            })),
          ]}
        />
      </TableView>
    </>
  );
}
