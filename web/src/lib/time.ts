/**
 * Store-local timestamps are ISO strings without a zone ("2026-10-11T08:00:00").
 * They are parsed as UTC so the server's / browser's timezone never shifts them.
 */
import { intlTag, type Locale } from "@/lib/i18n";

export const parseLocal = (iso: string): Date => new Date(iso.length === 10 ? `${iso}T00:00:00Z` : `${iso}Z`);

export const isoLocal = (ms: number): string => new Date(ms).toISOString().slice(0, 19);

export const isoDate = (iso: string): string => iso.slice(0, 10);

/** Monday = 0 … Sunday = 6 */
export const dayOfWeek = (ms: number | string): number => {
  const d = typeof ms === "string" ? parseLocal(ms) : new Date(ms);
  return (d.getUTCDay() + 6) % 7;
};

export const hourOf = (iso: string): number => parseLocal(iso).getUTCHours();

const intl = (locale: Locale, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlTag(locale), { timeZone: "UTC", ...opts });

/** Short weekday names, Monday first. */
export const weekdays = (locale: Locale): string[] =>
  Array.from({ length: 7 }, (_, i) => intl(locale, { weekday: "short" }).format(Date.UTC(2026, 9, 12 + i))); // 12 Oct 2026 is a Monday

/** "Sat 24 Oct" / "ส. 24 ต.ค." */
export const fmtDay = (iso: string, locale: Locale): string => intl(locale, { weekday: "short", day: "numeric", month: "short" }).format(parseLocal(iso));

/** "24 Oct" / "24 Oct 2026" (Thai: "24 ต.ค. 2569") */
export const fmtDate = (iso: string, locale: Locale, withYear = false): string =>
  intl(locale, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(parseLocal(iso));

export const fmtDateTime = (iso: string, locale: Locale): string => `${fmtDay(iso, locale)} ${iso.slice(11, 16)}`;
