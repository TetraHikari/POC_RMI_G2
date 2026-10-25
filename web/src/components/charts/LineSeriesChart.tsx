"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useI18n } from "@/components/i18n/I18nProvider";

import { AXIS, TipBox, TipRow } from "./core";
import { formatter, type FmtKey } from "@/lib/format";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

/** Multi-series line chart with a crosshair tooltip. Rows: { x, [seriesKey]: number }. */
export function LineSeriesChart({
  data,
  series,
  xKey = "x",
  xFmt = "text",
  yFmt = "1dp",
  yLabel,
  height = 300,
  markers = false,
}: {
  data: Record<string, number | string>[];
  series: LineSeries[];
  xKey?: string;
  xFmt?: FmtKey;
  yFmt?: FmtKey;
  yLabel?: string;
  height?: number;
  markers?: boolean;
}) {
  const { locale } = useI18n();
  const xFormat = formatter(xFmt, locale);
  const yFormat = formatter(yFmt, locale);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey={xKey} {...AXIS} tickFormatter={xFormat} minTickGap={24} />
        <YAxis
          {...AXIS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => (yFmt === "1dp" && Number.isInteger(v) ? String(v) : yFormat(v))}
          width={56}
          label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fill: "var(--ink-2)", fontSize: 12, dy: 50 } : undefined}
        />
        <Tooltip
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="mb-1 font-medium">{xFormat(label as string)}</div>
                {[...payload]
                  .sort((a, b) => Number(b.value) - Number(a.value))
                  .map((p) => (
                    <TipRow key={String(p.dataKey)} color={p.color} label={series.find((s) => s.key === p.dataKey)?.label} value={yFormat(Number(p.value))} />
                  ))}
              </TipBox>
            ) : null
          }
        />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={markers ? { r: 3.5, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 } : false}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
