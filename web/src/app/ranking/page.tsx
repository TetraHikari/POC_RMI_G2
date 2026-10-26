import { BarList } from "@/components/charts/BarList";
import { DotRangePlot } from "@/components/charts/DotRangePlot";
import { MetricExplainer } from "@/components/explainers/MetricExplainer";
import { ScreenFilters } from "@/components/filters/ScreenFilters";
import { ChartCard, DataTable, Empty, PageHeader, Section, TableView } from "@/components/ui/primitives";
import { screenSummary } from "@/lib/analytics";
import type { SearchParams } from "@/lib/filters";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import { loadScreenContext } from "@/lib/page-context";

export default async function RankingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await loadScreenContext(searchParams);
  const { hourly, labels, t } = ctx;
  const T = t.ranking;

  const header = (
    <>
      <PageHeader title={T.title} description={T.description} />
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

  const summary = screenSummary(hourly);

  const drivers = [
    { key: "footTrafficPerH", title: t.metrics.footTrafficPerHour, fmt: (v: number) => fmtInt(v) },
    { key: "exposureRate", title: t.metrics.exposureRate, fmt: (v: number) => fmtPct(v, 0) },
    { key: "medianDwellS", title: t.metrics.medianDwellS, fmt: (v: number) => fmt1(v) },
  ] as const;

  return (
    <>
      {header}
      <ChartCard
        className="mt-4"
        title={
          <span className="inline-flex items-center">
            {t.overview.seiByScreen}
            <MetricExplainer kind="sei" />
          </span>
        }
        subtitle={t.metrics.exposurePerHour}
      >
        <DotRangePlot
          xLabel={t.metrics.exposurePerHour}
          series={[{ key: "sei", label: "SEI", color: "var(--series-1)", shape: "dot" }]}
          rows={summary.map((r) => ({
            label: `#${r.rank} ${labels.get(r.screenId)}`,
            values: { sei: { value: r.sei, low: r.seiLow, high: r.seiHigh } },
            note: T.storeHours(r.hours),
          }))}
        />
      </ChartCard>

      <Section title={T.driversTitle} description={T.driversDesc}>
        <div className="grid gap-3 md:grid-cols-3">
          {drivers.map((d) => (
            <ChartCard key={d.key} title={d.title}>
              <BarList rows={summary.map((r) => ({ label: labels.get(r.screenId)!, value: r[d.key], display: d.fmt(r[d.key]) }))} />
            </ChartCard>
          ))}
        </div>
      </Section>

      <TableView label={T.tableLabel}>
        <DataTable
          rows={summary}
          columns={[
            { key: "rank", header: t.overview.rank, render: (r) => r.rank, align: "right" },
            { key: "screen", header: t.common.screen, render: (r) => labels.get(r.screenId) },
            { key: "sei", header: t.metrics.seiPerH, render: (r) => fmt1(r.sei), align: "right" },
            { key: "ci", header: t.common.ci95, render: (r) => `${fmt1(r.seiLow)}–${fmt1(r.seiHigh)}`, align: "right" },
            { key: "hours", header: T.hours, render: (r) => r.hours, align: "right" },
          ]}
        />
      </TableView>
    </>
  );
}
