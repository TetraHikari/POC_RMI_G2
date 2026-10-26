import { RankList } from "@/components/charts/RankList";
import { LineSeriesChart } from "@/components/charts/LineSeriesChart";
import { MetricExplainer } from "@/components/explainers/MetricExplainer";
import { ScreenFilters } from "@/components/filters/ScreenFilters";
import { ChartCard, DataTable, Empty, HeaderStat, Kpi, Legend, LegendItem, PageHeader, TableView } from "@/components/ui/primitives";
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
      <PageHeader
        title={t.overview.title}
        description={t.overview.description(f.screenIds.length)}
        aside={<HeaderStat label={t.common.dataWindow} value={`${fmtDate(f.from, locale)} – ${fmtDate(f.to, locale, true)}`} />}
      />
      <ScreenFilters ctx={ctx} />
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
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi primary icon="screen" label={t.metrics.avgSei} value={`${fmt1(ev / hourly.length)} ${t.units.perHour}`} info={<MetricExplainer kind="sei" />} footer={t.overview.kpiFoot.sei} />
        <Kpi icon="users" label={t.metrics.footTraffic} value={fmtInt(ft)} info={<MetricExplainer kind="footTraffic" />} footer={t.overview.kpiFoot.footTraffic} />
        <Kpi icon="eye" label={t.metrics.exposureEvents} value={fmtInt(ev)} info={<MetricExplainer kind="exposure" />} footer={t.overview.kpiFoot.exposureEvents} />
        <Kpi icon="percent" label={t.metrics.exposureRate} value={fmtPct(ev / ft)} hint={t.hints.exposureRate} footer={t.overview.kpiFoot.exposureRate} />
        <Kpi icon="clock" label={t.metrics.medianDwell} value={fmtSec(median(hourly.map((h) => h.medianDwellS)), locale)} info={<MetricExplainer kind="dwell" />} footer={t.overview.kpiFoot.dwell} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <ChartCard
          title={t.overview.byHour}
          subtitle={t.overview.byHourDesc}
          actions={
            <Legend>
              {lineSeries.map((l) => (
                <LegendItem key={l.key} color={l.color} label={l.label} shape="line" />
              ))}
            </Legend>
          }
        >
          <LineSeriesChart data={byHour} series={lineSeries} xFmt="hour" yFmt="1dp" height={280} area />
        </ChartCard>
        <ChartCard
          title={
            <span className="inline-flex items-center">
              {t.overview.seiByScreen}
              <MetricExplainer kind="sei" />
            </span>
          }
          subtitle={t.metrics.exposurePerHour}
        >
          <RankList
            unitLabel={t.units.perHour}
            rows={summary.map((r) => ({
              key: r.screenId,
              rank: r.rank,
              label: labels.get(r.screenId)!,
              sublabel: screens.find((sc) => sc.screenId === r.screenId)?.iabZone,
              detail: `${t.metrics.footTrafficPerH} ${fmtInt(r.footTrafficPerH)}`,
              value: r.sei,
              display: fmt1(r.sei),
              color: screenColor(r.screenId, allIds),
            }))}
          />
        </ChartCard>
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
