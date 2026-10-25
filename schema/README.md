# Database (PostgreSQL)

| File | What it is |
|---|---|
| `schema.sql` | 12 tables + 2 views, with enums, keys, constraints and indexes. PostgreSQL 15+. |
| `seed.sql` | STORE001: cameras CAM001 Entrance · CAM002 Beverage Zone · CAM003 Checkout, and the ad screen at each location (Zone A · B · C). |
| `er-diagram.drawio` | ER diagram generated from `schema.sql`, in tabs: **Overview**, **1 · Site setup**, **2–3 · Runs & measurements**, **4 · Validation**, **5 · Views**. Tables from other tabs appear faded and dashed. |

```bash
psql -v ON_ERROR_STOP=1 -d rmi -f schema.sql
psql -v ON_ERROR_STOP=1 -d rmi -f seed.sql
```

## Video files (not in the database)

Footage stays on the server's disk, laid out as the camera data arrives:

```
retail_video_data/
└── STORE001/                         ← stores.code
    └── CAM001_Entrance/              ← cameras.video_dir  (cameras.code + location)
        └── 2026-09-20/               ← date (store-local)
            ├── CLIP001_100000.mp4    ← file starting 10:00:00
            ├── CLIP002_100010.mp4    ← 10:00:10
            └── CLIP003_100020.mp4
```

`clips` (labelling samples) and `runs` are **time windows on a camera**; the pipeline finds the
files for a window from this layout, so a ~5-minute sample can span many short files.

## Tables

1. **Site setup** — `stores` → `cameras` (code, location, video folder) → `screens` (the ad screen at
   that camera's location; its numbers come from that camera).
2. **Capture & runs** — `clips` (sampled ~5-min footage with peak / day / lighting / density tags,
   dev/test split, primary annotator) and `runs` (one pipeline execution). A run's `config` is frozen
   and holds the measurement rules it used — `zone_radius_m: 4`, `facing_tolerance_deg: 60`,
   `min_exposure_s: 1` — plus sampling rate and model versions.
3. **Measurements** — written by the CV pipeline: `tracks`, `track_points` (per frame: floor position,
   head angle, state), `events` (`dwell` = a zone visit, `exposure` = facing ≥ 1 s).
4. **Validation** — `gt_persons` + `gt_facing_intervals` (human labels), `clip_scores` (scorer summary
   per run × screen), `error_tags` (miss taxonomy).
5. **Views** — `v_hourly_screen_metrics` (foot traffic, exposure events = SEI, exposure rate, median
   dwell / exposure per screen-hour, store-local time) and `v_clip_validation`
   (frozen scoring runs with clip conditions, for the H1 / H2 pages).

## Rules enforced by the database

- Only one **frozen** scoring run per clip ("scored exactly once with frozen settings").
- A `validation` run must have a clip; a `continuous` run must not.
- Camera codes are unique per store; screen codes are unique.
- `tp + fn = gt_exposure_events` and `tp + fp = model_exposure_events` in `clip_scores`.
- Clips and events can't end before they start.

## Notes

- **Privacy (PDPA):** no images, faces or names — only track IDs, coordinates, angles and derived
  events. Annotators are pseudonyms. Raw video stays on the clips volume; set `clips.file_path` to
  NULL when it's deleted.
- **Volume:** `track_points` grows fastest. For continuous runs, partition it by month on `ts` and add
  a retention job.
- **Web app mapping:** enum values use snake_case (`off_peak`, `missed_exposure`, `id_switch`); the mock
  data uses display strings (`off-peak`, `missed exposure`). The upcoming `web/src/lib/data/postgres.ts`
  maps between them.
- Tested on PostgreSQL 16 (PGlite): schema + seed load cleanly, both views return the expected numbers on
  sample rows, and the rules above reject bad data.
