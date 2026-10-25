-- =============================================================================
-- AI Retail Media Intelligence — PostgreSQL schema
-- Team 2 · CMKL × CP Axtra POC (single branch)
--
-- Target: PostgreSQL 15+ (runs on the branch server in the `postgres` container).
-- Run:    psql -v ON_ERROR_STOP=1 -f schema.sql   (then seed.sql)
--
-- 12 tables + 2 views
--   1. Site setup      stores, cameras (code + location), screens (the ad screen at a camera's location)
--   2. Capture & runs  clips (sampled footage), runs (one pipeline execution; frozen config incl.
--                      the ≤4 m / ±60° / ≥1 s rules)
--   3. Measurements    tracks, track_points, events      ← written by the CV pipeline
--   4. Validation      gt_persons, gt_facing_intervals,
--                      clip_scores, error_tags           ← human labels + scorer output
--   5. Views           v_hourly_screen_metrics, v_clip_validation  ← read by the web app
--
-- Video files are not stored in the database. They live on the server under
--   retail_video_data/<store code>/<camera video_dir>/<YYYY-MM-DD>/CLIP<seq>_<HHMMSS>.mp4
--   e.g. retail_video_data/STORE001/CAM001_Entrance/2026-09-20/CLIP001_100000.mp4
-- (HHMMSS = the file's start time in store-local time). Clips and runs are time windows on a
-- camera; the pipeline finds the files for a window from this layout.
--
-- Privacy (PDPA): no images, faces or identities are stored — only track IDs,
-- floor coordinates, head angles and derived events/metrics. Raw video is deleted
-- from the server after the retention period.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Enumerations
-- -----------------------------------------------------------------------------
-- IAB/IAB Europe in-store zones (Dec 2024 standard)
CREATE TYPE iab_zone       AS ENUM ('exterior', 'entrance', 'checkout', 'in_aisle', 'other');
CREATE TYPE day_type       AS ENUM ('weekday', 'weekend');
CREATE TYPE peak_type      AS ENUM ('peak', 'off_peak');
CREATE TYPE lighting_level AS ENUM ('bright', 'dim');
CREATE TYPE density_level  AS ENUM ('low', 'medium', 'high');
CREATE TYPE clip_split     AS ENUM ('dev', 'test');
CREATE TYPE run_kind       AS ENUM ('continuous', 'validation');
CREATE TYPE run_status     AS ENUM ('queued', 'running', 'succeeded', 'failed');
CREATE TYPE track_state    AS ENUM ('outside', 'in_zone', 'facing');
-- dwell    = one visit to the screen's viewing zone (enter → exit); foot traffic counts tracks with a dwell event
-- exposure = a continuous facing run that met the minimum duration
CREATE TYPE event_type     AS ENUM ('dwell', 'exposure');
CREATE TYPE error_outcome  AS ENUM ('missed_exposure', 'false_exposure', 'count_error', 'dwell_error');
CREATE TYPE error_kind     AS ENUM ('occlusion', 'id_switch', 'wrong_facing', 'other');


-- =============================================================================
-- 1. Site setup
-- =============================================================================

CREATE TABLE stores (
    store_id    integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        text        NOT NULL UNIQUE,                 -- e.g. 'STORE001' (= top folder in retail_video_data/)
    name        text        NOT NULL,
    timezone    text        NOT NULL DEFAULT 'Asia/Bangkok', -- hourly metrics are bucketed in local time
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cameras (
    camera_id   integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id    integer     NOT NULL REFERENCES stores ON DELETE CASCADE,
    code        text        NOT NULL,                        -- 'CAM001', 'CAM002', …
    location    text        NOT NULL,                        -- 'Entrance', 'Beverage Zone', 'Checkout'
    video_dir   text        NOT NULL,                        -- folder under the store, e.g. 'CAM001_Entrance'
    stream_url  text,                                        -- live feed via the stream gateway (after the POC)
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (store_id, code)
);

-- The ad screen at a camera's location; its numbers come from that camera's footage.
CREATE TABLE screens (
    screen_id   integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    camera_id   integer     NOT NULL REFERENCES cameras ON DELETE CASCADE,
    code        text        NOT NULL UNIQUE,                 -- 'A', 'B', 'C' (name 'Zone A' …)
    name        text        NOT NULL,
    iab_zone    iab_zone    NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX screens_camera ON screens (camera_id);


-- =============================================================================
-- 2. Capture & runs
-- =============================================================================

-- ~5-minute windows sampled for labelling (proposal step 1). A window usually spans
-- several consecutive CLIP<seq>_<HHMMSS>.mp4 files of the camera.
CREATE TABLE clips (
    clip_id           bigint         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code              text           NOT NULL UNIQUE,        -- e.g. 'CAM003-01'
    camera_id         integer        NOT NULL REFERENCES cameras ON DELETE RESTRICT,
    start_ts          timestamptz    NOT NULL,
    end_ts            timestamptz    NOT NULL,
    duration_s        real           GENERATED ALWAYS AS (extract(epoch FROM end_ts - start_ts)) STORED,
    peak              peak_type      NOT NULL,
    day_type          day_type       NOT NULL,
    lighting          lighting_level,
    density           density_level,
    split             clip_split,                            -- NULL = not part of validation
    primary_annotator text,                                  -- pseudonym whose labels are the ground truth
    created_at        timestamptz    NOT NULL DEFAULT now(),
    CHECK (end_ts > start_ts)
);
CREATE INDEX clips_camera ON clips (camera_id, start_ts);

-- One execution of the pipeline: either a validation clip or a stretch of continuous footage.
-- config holds everything the numbers depend on, frozen per run, e.g.
--   {"zone_radius_m": 4, "facing_tolerance_deg": 60, "min_exposure_s": 1,
--    "sample_fps": 5, "detector": "yolo26n", "pose": "yolo26n-pose", "tracker": "bytetrack", "git": "a1b2c3d"}
CREATE TABLE runs (
    run_id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind           run_kind    NOT NULL,
    camera_id      integer     NOT NULL REFERENCES cameras ON DELETE RESTRICT,
    clip_id        bigint      REFERENCES clips ON DELETE CASCADE,
    status         run_status  NOT NULL DEFAULT 'queued',
    config         jsonb       NOT NULL,
    is_frozen      boolean     NOT NULL DEFAULT false,       -- the one official scoring run for a clip
    window_start   timestamptz NOT NULL,                     -- footage covered by this run
    window_end     timestamptz NOT NULL,
    started_at     timestamptz,
    finished_at    timestamptz,
    error_message  text,
    CHECK (window_end > window_start),
    CHECK ((kind = 'validation') = (clip_id IS NOT NULL))
);
-- "Test clips are scored exactly once with frozen settings."
CREATE UNIQUE INDEX runs_one_frozen_per_clip ON runs (clip_id) WHERE is_frozen;
CREATE INDEX runs_camera_window ON runs (camera_id, window_start);


-- =============================================================================
-- 3. Measurements (written by the CV pipeline)
-- =============================================================================

CREATE TABLE tracks (
    track_id  bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id    bigint      NOT NULL REFERENCES runs ON DELETE CASCADE,
    local_id  integer     NOT NULL,                          -- tracker (ByteTrack) ID inside the run
    first_ts  timestamptz NOT NULL,
    last_ts   timestamptz NOT NULL,
    UNIQUE (run_id, local_id),
    CHECK (last_ts >= first_ts)
);

-- One row per person per sampled frame per screen. Largest table:
-- for continuous runs, partition monthly on ts and add a retention job.
CREATE TABLE track_points (
    track_id     bigint      NOT NULL REFERENCES tracks  ON DELETE CASCADE,
    screen_id    integer     NOT NULL REFERENCES screens,
    ts           timestamptz NOT NULL,
    floor_x_m    real,                                       -- position relative to the screen, if estimated
    floor_y_m    real,
    head_yaw_deg real,                                       -- head direction vs. the screen; NULL = not visible
    state        track_state NOT NULL,
    PRIMARY KEY (track_id, screen_id, ts)
);
CREATE INDEX track_points_screen_ts ON track_points (screen_id, ts);

CREATE TABLE events (
    event_id   bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id     bigint      NOT NULL REFERENCES runs    ON DELETE CASCADE,
    track_id   bigint      NOT NULL REFERENCES tracks  ON DELETE CASCADE,
    screen_id  integer     NOT NULL REFERENCES screens,
    type       event_type  NOT NULL,
    start_ts   timestamptz NOT NULL,
    end_ts     timestamptz NOT NULL,
    duration_s real        GENERATED ALWAYS AS (extract(epoch FROM end_ts - start_ts)) STORED,
    CHECK (end_ts >= start_ts)
);
CREATE INDEX events_screen_start ON events (screen_id, start_ts);
CREATE INDEX events_run          ON events (run_id);


-- =============================================================================
-- 4. Validation (human ground truth + scorer output)
-- =============================================================================

-- A person as labelled by one annotator in one clip, relative to one screen.
CREATE TABLE gt_persons (
    gt_person_id bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clip_id      bigint  NOT NULL REFERENCES clips ON DELETE CASCADE,
    screen_id    integer NOT NULL REFERENCES screens,
    annotator    text    NOT NULL,                           -- pseudonym; 20% of clips have two annotators
    entry_s      real    NOT NULL CHECK (entry_s >= 0),      -- seconds from clip start
    exit_s       real    NOT NULL,
    CHECK (exit_s >= entry_s)
);
CREATE INDEX gt_persons_clip ON gt_persons (clip_id, annotator);

CREATE TABLE gt_facing_intervals (
    gt_facing_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gt_person_id bigint NOT NULL REFERENCES gt_persons ON DELETE CASCADE,
    start_s      real   NOT NULL CHECK (start_s >= 0),
    end_s        real   NOT NULL,
    CHECK (end_s > start_s)
);

-- Per run × screen summary written by the scorer (model vs. the clip's primary annotator).
CREATE TABLE clip_scores (
    run_id                bigint      NOT NULL REFERENCES runs    ON DELETE CASCADE,
    screen_id             integer     NOT NULL REFERENCES screens,
    gt_foot_traffic       integer     NOT NULL CHECK (gt_foot_traffic    >= 0),
    model_foot_traffic    integer     NOT NULL CHECK (model_foot_traffic >= 0),
    gt_median_dwell_s     real,
    model_median_dwell_s  real,
    gt_exposure_events    integer     NOT NULL,
    model_exposure_events integer     NOT NULL,
    tp                    integer     NOT NULL CHECK (tp >= 0),
    fp                    integer     NOT NULL CHECK (fp >= 0),
    fn                    integer     NOT NULL CHECK (fn >= 0),
    scored_at             timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (run_id, screen_id),
    CHECK (tp + fn = gt_exposure_events),
    CHECK (tp + fp = model_exposure_events)
);

-- Every miss tagged with the proposal's error taxonomy (step 4).
CREATE TABLE error_tags (
    error_id     bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id       bigint        NOT NULL REFERENCES runs ON DELETE CASCADE,
    screen_id    integer       REFERENCES screens,
    track_id     bigint        REFERENCES tracks     ON DELETE SET NULL,
    gt_person_id bigint        REFERENCES gt_persons ON DELETE SET NULL,
    outcome      error_outcome NOT NULL,
    kind         error_kind    NOT NULL,
    t_offset_s   real          CHECK (t_offset_s >= 0),      -- seconds from clip start
    note         text
);
CREATE INDEX error_tags_run ON error_tags (run_id);


-- =============================================================================
-- 5. Views read by the web app (shapes match web/src/lib/data/types.ts)
-- =============================================================================

-- Hourly per-screen metrics from continuous footage, in store-local time.
-- SEI = exposure_events (per hour); exposure_rate = exposure_events ÷ foot_traffic.
CREATE VIEW v_hourly_screen_metrics AS
SELECT
    s.screen_id,
    date_trunc('hour', e.start_ts AT TIME ZONE st.timezone)                    AS hour_start,
    count(DISTINCT e.track_id) FILTER (WHERE e.type = 'dwell')                   AS foot_traffic,
    count(*)                   FILTER (WHERE e.type = 'exposure')                AS exposure_events,
    round(count(*) FILTER (WHERE e.type = 'exposure')::numeric
          / NULLIF(count(DISTINCT e.track_id) FILTER (WHERE e.type = 'dwell'), 0), 4) AS exposure_rate,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY e.duration_s) FILTER (WHERE e.type = 'dwell')    AS median_dwell_s,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY e.duration_s) FILTER (WHERE e.type = 'exposure') AS median_exposure_s
FROM events e
JOIN runs    r  ON r.run_id = e.run_id AND r.kind = 'continuous' AND r.status = 'succeeded'
JOIN screens s  ON s.screen_id = e.screen_id
JOIN cameras c  ON c.camera_id = s.camera_id
JOIN stores  st ON st.store_id = c.store_id
GROUP BY s.screen_id, hour_start;

-- One row per frozen scoring run × screen, with the clip's conditions (feeds the H1 / H2 pages).
CREATE VIEW v_clip_validation AS
SELECT
    c.clip_id,
    c.code          AS clip_code,
    sc.screen_id,
    c.split,
    c.lighting,
    c.density,
    c.peak,
    c.day_type,
    c.duration_s,
    sc.run_id,
    sc.gt_foot_traffic,
    sc.model_foot_traffic,
    sc.gt_median_dwell_s,
    sc.model_median_dwell_s,
    sc.gt_exposure_events,
    sc.model_exposure_events,
    sc.tp,
    sc.fp,
    sc.fn
FROM clip_scores sc
JOIN runs  r ON r.run_id = sc.run_id AND r.is_frozen
JOIN clips c ON c.clip_id = r.clip_id;

COMMIT;
