CREATE TABLE shopper_screen_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id VARCHAR NOT NULL,
    screen_id VARCHAR NOT NULL,
    track_id VARCHAR(128) NOT NULL,
    entry_timestamp TIMESTAMPTZ NOT NULL,
    exit_timestamp TIMESTAMPTZ NOT NULL,
    dwell_time_seconds DOUBLE PRECISION NOT NULL,
    exposure_event BOOLEAN NOT NULL
);

CREATE INDEX ix_shopper_screen_events_camera_id
    ON shopper_screen_events (camera_id);

CREATE INDEX ix_shopper_screen_events_screen_id
    ON shopper_screen_events (screen_id);

CREATE INDEX ix_shopper_screen_events_entry_timestamp
    ON shopper_screen_events (entry_timestamp);