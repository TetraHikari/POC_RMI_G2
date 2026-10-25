-- =============================================================================
-- Seed: STORE001 site setup (single-branch POC). Run after schema.sql.
-- Matches the camera data: retail_video_data/STORE001/CAM00x_<Location>/<date>/CLIP###_HHMMSS.mp4
-- =============================================================================

BEGIN;

INSERT INTO stores (code, name) VALUES ('STORE001', 'Store 001');

-- CCTV cameras, one per location; video_dir is the camera's folder under retail_video_data/STORE001/.
INSERT INTO cameras (store_id, code, location, video_dir)
SELECT st.store_id, v.code, v.location, v.code || '_' || replace(v.location, ' ', '')
FROM stores st,
     (VALUES ('CAM001', 'Entrance'),
             ('CAM002', 'Beverage Zone'),
             ('CAM003', 'Checkout')) AS v(code, location)
WHERE st.code = 'STORE001';

-- The ad screen at each camera location, shown on the dashboard as Zone A / B / C.
INSERT INTO screens (camera_id, code, name, iab_zone)
SELECT c.camera_id, v.code, 'Zone ' || v.code, v.iab_zone::iab_zone
FROM (VALUES ('CAM001', 'A', 'entrance'),
             ('CAM002', 'B', 'in_aisle'),
             ('CAM003', 'C', 'checkout')) AS v(cam, code, iab_zone)
JOIN cameras c ON c.code = v.cam;

COMMIT;
