/**
 * PostgreSQL DataSource over `shopper_screen_events` (db/init/01_schema.sql).
 * Screens, the date range and store hours all come from the rows in the table,
 * so adding a camera/screen to the data adds it to the dashboard.
 *
 * Env: DATABASE_URL (default postgres://rmi:rmi@localhost:5432/rmi), RMI_TZ (default Asia/Bangkok).
 */
import "server-only";

import { Pool } from "pg";
import type { DataSource, HourlyMetric, Screen, Store, Visit } from "./types";

const TZ = process.env.RMI_TZ ?? "Asia/Bangkok";
const STORE: Store = { storeId: 1, storeName: "Store 001" }; // the events table has no store column

const globalForPg = globalThis as unknown as { rmiPool?: Pool };
const pool = (globalForPg.rmiPool ??= new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://rmi:rmi@localhost:5432/rmi",
  max: 5,
}));

/** "screen10" sorts after "screen2". */
const natural = new Intl.Collator("en", { numeric: true }).compare;

/** "screen2" → "Screen 2", "lobby_tv" → "Lobby tv" */
function displayName(raw: string): string {
  const s = raw.replace(/[_-]+/g, " ").replace(/([a-z])(\d)/gi, "$1 $2").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Raw screen_id → numeric id used in URLs and charts (1-based, natural order). */
async function screenIndex(): Promise<{ screens: Screen[]; idOf: Map<string, number> }> {
  const { rows } = await pool.query<{ screen_id: string; cameras: string }>(
    `SELECT screen_id, string_agg(DISTINCT camera_id, ', ' ORDER BY camera_id) AS cameras
       FROM shopper_screen_events GROUP BY screen_id`,
  );
  rows.sort((a, b) => natural(a.screen_id, b.screen_id));
  const screens = rows.map((r, i): Screen => {
    const name = displayName(r.screen_id);
    return {
      screenId: i + 1,
      storeId: STORE.storeId,
      storeName: STORE.storeName,
      code: r.screen_id,
      name,
      label: name,
      iabZone: r.cameras.toUpperCase(), // no zone in the data; show the source camera
    };
  });
  return { screens, idOf: new Map(rows.map((r, i) => [r.screen_id, i + 1])) };
}

/**
 * One row per screen × store-local hour, zero-filled over every day in the data
 * and every hour between the earliest and latest hour seen (= store hours).
 * Foot traffic = zone visits (rows); exposure events = visits flagged exposure_event.
 */
const HOURLY_SQL = `
WITH ev AS (
  SELECT screen_id,
         date_trunc('hour', entry_timestamp AT TIME ZONE $1) AS h,
         dwell_time_seconds AS dwell,
         exposure_event     AS exposed
    FROM shopper_screen_events
),
b AS (
  SELECT min(h)::date AS d0, max(h)::date AS d1,
         min(extract(hour FROM h))::int AS h0, max(extract(hour FROM h))::int AS h1
    FROM ev
),
grid AS (
  SELECT s.screen_id, day + make_interval(hours => hr) AS h
    FROM (SELECT DISTINCT screen_id FROM ev) s, b,
         generate_series(b.d0, b.d1, interval '1 day') AS day,
         generate_series(b.h0, b.h1) AS hr
),
agg AS (
  SELECT screen_id, h,
         count(*)                                                        AS foot_traffic,
         count(*) FILTER (WHERE exposed)                                 AS exposure_events,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY dwell)               AS median_dwell_s,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY dwell) FILTER (WHERE exposed) AS median_exposure_s
    FROM ev GROUP BY screen_id, h
)
SELECT g.screen_id,
       to_char(g.h, 'YYYY-MM-DD"T"HH24:MI:SS') AS hour_start,
       coalesce(a.foot_traffic, 0)::int          AS foot_traffic,
       coalesce(a.exposure_events, 0)::int       AS exposure_events,
       a.median_dwell_s,                         -- NULL when the hour had no visits
       a.median_exposure_s                       -- NULL when the hour had no exposures
  FROM grid g LEFT JOIN agg a USING (screen_id, h)
 ORDER BY g.screen_id, g.h`;

const round2 = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);

async function hourly(): Promise<HourlyMetric[]> {
  const [{ idOf }, { rows }] = await Promise.all([
    screenIndex(),
    pool.query<{
      screen_id: string;
      hour_start: string;
      foot_traffic: number;
      exposure_events: number;
      median_dwell_s: number | null;
      median_exposure_s: number | null;
    }>(HOURLY_SQL, [TZ]),
  ]);
  return rows.map((r) => ({
    screenId: idOf.get(r.screen_id)!,
    hourStart: r.hour_start,
    footTraffic: r.foot_traffic,
    exposureEvents: r.exposure_events,
    exposureRate: r.foot_traffic ? r.exposure_events / r.foot_traffic : 0,
    medianDwellS: round2(r.median_dwell_s),
    medianExposureS: round2(r.median_exposure_s),
  }));
}

async function visits(): Promise<Visit[]> {
  const [{ idOf }, { rows }] = await Promise.all([
    screenIndex(),
    pool.query<{ screen_id: string; hour_start: string; dwell_s: number; exposed: boolean }>(
      `SELECT screen_id,
              to_char(date_trunc('hour', entry_timestamp AT TIME ZONE $1), 'YYYY-MM-DD"T"HH24:MI:SS') AS hour_start,
              dwell_time_seconds AS dwell_s,
              exposure_event     AS exposed
         FROM shopper_screen_events`,
      [TZ],
    ),
  ]);
  return rows.map((r) => ({ screenId: idOf.get(r.screen_id)!, hourStart: r.hour_start, dwellS: r.dwell_s, exposed: r.exposed }));
}

export const postgresSource: DataSource = {
  name: "postgres",
  config: { zoneRadiusM: 4, facingDeg: 60, minExposureS: 1, trackDt: 0.2 },
  stores: async () => [STORE],
  screens: async () => (await screenIndex()).screens,
  hourly,
  visits,
  // Validation data (clips, labels, scores, track points) isn't in this schema yet.
  clips: async () => [],
  clipScores: async () => [],
  errors: async () => [],
  agreement: async () => [],
  trackPoints: async () => [],
};
