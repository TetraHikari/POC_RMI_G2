-- Load the October 2026 mock events (runs once, on first container start).
COPY shopper_screen_events
    (event_id, camera_id, screen_id, track_id, entry_timestamp, exit_timestamp, dwell_time_seconds, exposure_event)
FROM '/data/shopper_screen_events_october_2026.csv'
WITH (FORMAT csv, HEADER true);
