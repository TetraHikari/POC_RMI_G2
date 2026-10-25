import { BarList } from "@/components/charts/BarList";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { MetricExplainer } from "@/components/explainers/MetricExplainer";
import { ScreenFilters } from "@/components/filters/ScreenFilters";
import { ChartCard, DataTable, Empty, Kpi, Legend, LegendItem, PageHeader, Section, TableView } from "@/components/ui/primitives";
import { groupBy, median, screenSummary } from "@/lib/analytics";
import { screenColor } from "@/lib/colors";
import type { SearchParams } from "@/lib/filters";
import { fmt1, fmtInt, fmtPct, fmtSec } from "@/lib/format";
import { loadScreenContext } from "@/lib/page-context";
import { fmtDate, hourOf } from "@/lib/time";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await loadScreenContext(searchParams);
  const { hourly, screens, labels, filters: f, t, locale } = ctx;
  const allIds = screens.map((s) => s.screenId);

  const header = (
    <>
      <ScreenFilters ctx={ctx} />
      <PageHeader title={t.overview.title} description={t.overview.description(fmtDate(f.from, locale), fmtDate(f.to, locale, true), f.screenIds.length)} />
    </>
  );
  if (!hourly.length)
    return (
      <>
        {header}
        <Empty>{t.common.noData}</Empty>
      </>
    );

  const ft = hourly.reduce((a, h) => a + h.footTraffic, 0);
  const ev = hourly.reduce((a, h) => a + h.exposureEvents, 0);
  const summary = screenSummary(hourly);

  const byHour = [...groupBy(hourly, (h) => hourOf(h.hourStart))]
    .sort(([a], [b]) => a - b)
    .map(([hour, g]) => {
      const row: Record<string, number> = { x: hour };
      for (const [sid, gs] of groupBy(g, (h) => h.screenId)) row[`s${sid}`] = gs.reduce((a, h) => a + h.exposureEvents, 0) / gs.length;
      return row;
    });
  const lineSeries = f.screenIds.map((id) => ({ key: `s${id}`, label: labels.get(id)!, color: screenColor(id, allIds) }));

  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label={t.metrics.footTraffic} value={fmtInt(ft)} info={<MetricExplainer kind="footTraffic" />} />
        <Kpi label={t.metrics.exposureEvents} value={fmtInt(ev)} info={<MetricExplainer kind="exposure" />} />
        <Kpi label={t.metrics.exposureRate} value={fmtPct(ev / ft)} hint={t.hints.exposureRate} />
        <Kpi label={t.metrics.medianDwell} value={fmtSec(median(hourly.map((h) => h.medianDwellS)), locale)} info={<MetricExplainer kind="dwell" />} />
        <Kpi label={t.metrics.avgSei} value={`${fmt1(ev / hourly.length)} ${t.units.perHour}`} info={<MetricExplainer kind="sei" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Section
          title={
            <span className="inline-flex items-center">
              {t.overview.seiByScreen}
              <MetricExplainer kind="sei" />
            </span>
          }
          description={t.metrics.exposurePerHour}
        >
          <ChartCard>
            <BarList unitLabel={t.units.perHour} rows={summary.map((r) => ({ label: labels.get(r.screenId)!, value: r.sei, display: fmt1(r.sei) }))} />
          </ChartCard>
        </Section>
        <Section title={t.overview.byHour} description={t.overview.byHourDesc}>
          <ChartCard>
            <Legend>
              {lineSeries.map((l) => (
                <LegendItem key={l.key} color={l.color} label={l.label} shape="line" />
              ))}
            </Legend>
            <LineSeriesChart data={byHour} series={lineSeries} xFmt="hour" yFmt="1dp" height={260} />
          </ChartCard>
        </Section>
      </div>

      <TableView label={t.common.tableView}>
        <DataTable
          rows={summary}
          columns={[
            { key: "rank", header: t.overview.rank, render: (r) => r.rank, align: "right" },
            { key: "screen", header: t.common.screen, render: (r) => labels.get(r.screenId) },
            { key: "zone", header: t.overview.iabZone, render: (r) => screens.find((sc) => sc.screenId === r.screenId)?.iabZone },
            { key: "sei", header: t.metrics.seiPerH, render: (r) => fmt1(r.sei), align: "right" },
            { key: "ci", header: t.common.ci95, render: (r) => `${fmt1(r.seiLow)}–${fmt1(r.seiHigh)}`, align: "right" },
            { key: "ft", header: t.metrics.footTrafficPerH, render: (r) => fmtInt(r.footTrafficPerH), align: "right" },
            { key: "rate", header: t.metrics.exposureRate, render: (r) => fmtPct(r.exposureRate), align: "right" },
            { key: "dwell", header: t.metrics.medianDwellS, render: (r) => fmt1(r.medianDwellS), align: "right" },
          ]}
        />
      </TableView>
    </>
  );
}
