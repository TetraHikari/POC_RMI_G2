import { getDict, type Locale } from "@/lib/i18n";
import { fmtDay } from "@/lib/time";

export const fmtInt = (v: number) => Math.round(v).toLocaleString("en-US");
export const fmt1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "–");
export const fmt2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "–");
export const fmtPct = (v: number, dp = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(dp)}%` : "–");
export const fmtSec = (v: number, locale: Locale) => `${fmt1(v)} ${getDict(locale).units.s}`;

/** Format a value in a metric's unit ("%" values are already percentages). */
export function fmtUnit(v: number, unit: "" | "%" | "s", locale: Locale): string {
  if (!Number.isFinite(v)) return "–";
  if (unit === "%") return `${v.toFixed(1)}%`;
  if (unit === "s") return fmtSec(v, locale);
  return v.toFixed(2);
}

/** Named formats so server components can tell client charts how to print values. */
export type FmtKey = "int" | "1dp" | "2dp" | "pct0" | "pct1" | "pctPts" | "s1" | "hour" | "day" | "text";

export function formatter(k: FmtKey, locale: Locale): (v: string | number) => string {
  switch (k) {
    case "int":
      return (v) => fmtInt(Number(v));
    case "1dp":
      return (v) => fmt1(Number(v));
    case "2dp":
      return (v) => fmt2(Number(v));
    case "pct0":
      return (v) => fmtPct(Number(v), 0);
    case "pct1":
      return (v) => fmtPct(Number(v), 1);
    case "pctPts": // value is already a percentage
      return (v) => `${fmt1(Number(v))}%`;
    case "s1":
      return (v) => fmtSec(Number(v), locale);
    case "hour":
      return (v) => `${String(v).padStart(2, "0")}:00`;
    case "day":
      return (v) => fmtDay(String(v), locale);
    default:
      return (v) => String(v);
  }
}
