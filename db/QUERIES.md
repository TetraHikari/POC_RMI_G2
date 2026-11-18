# Dashboard queries

The SQL the dashboard runs against `shopper_screen_events`, and how each number on the page is
built from it. Source: `web/src/lib/data/postgres.ts` (SQL) and `web/src/lib/analytics.ts` /
`web/src/app/*/page.tsx` (combining the rows).

In the app, `$1` is the store timezone (`RMI_TZ`, default `Asia/Bangkok`). The copies below use
`'Asia/Bangkok'` directly so they run as-is in DBeaver or `psql`.

## Definitions

| Term | Meaning in this table |
|---|---|
| Visit | One row: a shopper entering and leaving a screen's zone (≤ 4 m) |
| Foot traffic | Number of visits. Counts visits, not unique people: `track_id` restarts per video |
| Exposure event | A visit with `exposure_event = true` (facing the screen ±60° for ≥ 1 s) |
| Exposure rate | Exposure events ÷ foot traffic |
| Dwell time | `dwell_time_seconds`: time in the zone, whichever way the shopper faces |
| SEI | Screen Exposure Index = average exposure events per screen-hour |
| Store hour | An hour bucket in store-local time, from `entry_timestamp` |

---

## 1. Screens

**Used for:** the screen list, filters, labels. One screen per distinct `screen_id`, so a new
screen in the data appears on the dashboard automatically.

```sql
SELECT screen_id,
       string_agg(DISTINCT camera_id, ', ' ORDER BY camera_id) AS cameras
  FROM shopper_screen_events
 GROUP BY screen_id;
```

The app then sorts naturally (`screen2` before `screen10`), numbers the screens 1, 2, …, for URLs
and charts, shows `screen1` as "Screen 1", and shows the camera (`CAM01`) under the name.

---

## 2. Hourly metrics per screen

**Used for:** every chart and KPI except the dwell medians. One row per screen × store hour.

```sql
WITH ev AS (              -- each visit, bucketed into its store-local hour
  SELECT screen_id,
         date_trunc('hour', entry_timestamp AT TIME ZONE 'Asia/Bangkok') AS h,
         dwell_time_seconds AS dwell,
         exposure_event     AS exposed
    FROM shopper_screen_events
),
b AS (                    -- data range: first/last day, first/last hour seen (= store hours)
  SELECT min(h)::date AS d0, max(h)::date AS d1,
         min(extract(hour FROM h))::int AS h0, max(extract(hour FROM h))::int AS h1
    FROM ev
),
grid AS (                 -- every screen × day × store hour, so hours with no visits still appear
  SELECT s.screen_id, day + make_interval(hours => hr) AS h
    FROM (SELECT DISTINCT screen_id FROM ev) s, b,
         generate_series(b.d0, b.d1, interval '1 day') AS day,
         generate_series(b.h0, b.h1) AS hr
),
agg AS (                  -- metrics per screen-hour
  SELECT screen_id, h,
         count(*)                                                   AS foot_traffic,
         count(*) FILTER (WHERE exposed)                            AS exposure_events,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY dwell)         AS median_dwell_s,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY dwell)
                              FILTER (WHERE exposed)                AS median_exposure_s
    FROM ev GROUP BY screen_id, h
)
SELECT g.screen_id,
       to_char(g.h, 'YYYY-MM-DD"T"HH24:MI:SS') AS hour_start,
       coalesce(a.foot_traffic, 0)::int        AS foot_traffic,     -- empty hour = 0 visits
       coalesce(a.exposure_events, 0)::int     AS exposure_events,  -- empty hour = 0 exposures
       a.median_dwell_s,                       -- NULL when the hour had no visits
       a.median_exposure_s                     -- NULL when the hour had no exposures
  FROM grid g LEFT JOIN agg a USING (screen_id, h)
 ORDER BY g.screen_id, g.h;
```

Notes:
- **Zero-filling:** an hour with no visits counts as 0 for foot traffic and exposures, so SEI
  reflects quiet hours. The medians stay NULL instead, because an empty hour has no dwell time
  (a 0 there would pull the median down).
- **Exposure rate per hour** is worked out in the app as `exposure_events / foot_traffic`, or 0
  when the hour has no foot traffic.
- **`median_exposure_s`** is the median dwell of visits with an exposure. The table doesn't record
  how long the shopper faced the screen.

---

## 3. Visits (for exact dwell medians)

**Used for:** median dwell everywhere on the dashboard. The app matches these rows to the filtered
hourly rows by (screen, hour) and takes the median over the visits themselves, not over hourly
medians.

```sql
SELECT screen_id,
       to_char(date_trunc('hour', entry_timestamp AT TIME ZONE 'Asia/Bangkok'),
               'YYYY-MM-DD"T"HH24:MI:SS') AS hour_start,
       dwell_time_seconds AS dwell_s,
       exposure_event     AS exposed
  FROM shopper_screen_events;
```

---

## 4. How the dashboard combines them

Filters (store, screens, date range, weekday/weekend) pick hourly rows first; the numbers below
come from the rows that remain.

### Overview KPIs

| KPI | Formula | SQL equivalent (no filters) |
|---|---|---|
| Foot traffic | Σ foot_traffic | `count(*)` |
| Exposure events | Σ exposure_events | `count(*) FILTER (WHERE exposure_event)` |
| Exposure rate | Σ exposure_events ÷ Σ foot_traffic | `avg(exposure_event::int)` |
| SEI (avg / hour) | Σ exposure_events ÷ number of screen-hours (incl. empty hours) | see below |
| Median dwell | median of `dwell_s` over matching visits | `percentile_cont(0.5) WITHIN GROUP (ORDER BY dwell_time_seconds)` |

Check the headline numbers directly:

```sql
SELECT count(*)                                        AS foot_traffic,
       count(*) FILTER (WHERE exposure_event)          AS exposure_events,
       round(avg(exposure_event::int) * 100, 1)        AS exposure_rate_pct,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dwell_time_seconds)::numeric, 2)
                                                       AS median_dwell_s
  FROM shopper_screen_events;
```

SEI, with the same zero-filled screen-hours as query 2:

```sql
WITH ev AS (
  SELECT screen_id, date_trunc('hour', entry_timestamp AT TIME ZONE 'Asia/Bangkok') AS h, exposure_event
    FROM shopper_screen_events
), b AS (
  SELECT min(h)::date d0, max(h)::date d1, min(extract(hour FROM h))::int h0, max(extract(hour FROM h))::int h1 FROM ev
), slots AS (
  SELECT count(DISTINCT screen_id) * ((d1 - d0) + 1) * (h1 - h0 + 1) AS screen_hours FROM ev, b GROUP BY d0, d1, h0, h1
)
SELECT round((SELECT count(*) FILTER (WHERE exposure_event) FROM ev)::numeric / screen_hours, 2) AS sei
  FROM slots;
```

### Per screen (Overview table, Ranking page)

The same formulas grouped by screen. Ranking sorts by SEI and adds a 95% bootstrap interval,
computed in `analytics.ts` from the hourly exposure counts.

```sql
SELECT screen_id,
       count(*)                                        AS foot_traffic,
       count(*) FILTER (WHERE exposure_event)          AS exposure_events,
       round(avg(exposure_event::int) * 100, 1)        AS exposure_rate_pct,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY dwell_time_seconds)::numeric, 2) AS median_dwell_s
  FROM shopper_screen_events
 GROUP BY screen_id
 ORDER BY screen_id;
```

### Trends page

- **Daily lines:** hourly rows grouped by day × screen. SEI and foot traffic are averaged per hour,
  exposure rate is Σ exposures ÷ Σ foot traffic, and dwell is the median over that day's visits.
- **Heatmap:** the same, grouped by weekday × hour of day for one screen.

### Exposures by hour of day (Overview chart)

Average exposure events per screen for each hour of the day:

```sql
SELECT screen_id,
       extract(hour FROM h)::int AS hour_of_day,
       round(avg(exposure_events), 2) AS avg_exposure_events
  FROM ( -- query 2's output; paste it here or save it as a view
    SELECT screen_id, date_trunc('hour', entry_timestamp AT TIME ZONE 'Asia/Bangkok') AS h,
           count(*) FILTER (WHERE exposure_event) AS exposure_events
      FROM shopper_screen_events GROUP BY 1, 2
  ) x
 GROUP BY 1, 2
 ORDER BY 1, 2;
```

This short version skips empty hours, so its averages come out slightly higher than the
dashboard's. Use query 2's zero-filled rows for an exact match.
