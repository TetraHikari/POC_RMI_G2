import type { Screen } from "@/lib/data/types";

import { en, type Dict } from "./en";
import { th } from "./th";

export type Locale = "en" | "th";
export type { Dict };

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "EN" },
];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "rmi-locale";

const DICTS: Record<Locale, Dict> = { en, th };

export const isLocale = (v: unknown): v is Locale => v === "en" || v === "th";
export const getDict = (locale: Locale): Dict => DICTS[locale];

/** BCP 47 tag for Intl. Thai uses the Buddhist calendar by default (e.g. 2569). */
export const intlTag = (locale: Locale) => (locale === "th" ? "th-TH" : "en-GB");

/** Display name for a stored name, translated when a mapping exists. */
export const tName = (map: Record<string, string>, name: string) => map[name] ?? name;

export const screenLabel = (t: Dict, s: Pick<Screen, "name">) => tName(t.names.screens, s.name);
