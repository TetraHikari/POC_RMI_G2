# Pipeline — 30 s screen exposure / SEI (notebook-first)

Self-contained notebook pipeline for the two fixed 30 s clips. It is a **tuning and
validation harness** — it does not train models, write to Postgres, or produce a
production SEI claim.

## Current setup

| Item | Current |
|---|---|
| Clips | `Cam03.mp4`, `Cam04.mp4` — 30 s, 24 fps, 1280×720 |
| Screens | Camera-03 = one combined screen with two faces; Camera-04 = one face |
| Sampling | `sample_fps: 5` requested (~4.8 fps effective on 24 fps source) |
| Zone | 4 m radius + front half-plane |
| Facing | pose-yaw proxy, qualified within `±60°` |
| Minimum exposure | 1.0 s; gaps up to 0.4 s bridged |
| Qualified views | unique exposed ByteTrack IDs (`unique_shopper` mode) |
| Foot traffic | unique in-zone ByteTrack IDs with `dwell_i > 0` |
| Output | raw 30 s SEI table + audits under `artifacts/pipeline/` |

## Run

```bash
uv sync
uv run --with jupyter jupyter lab pipeline/run_pipeline.ipynb   # Run All
```

Detection + conditional pose takes roughly 1–2 min on CPU for the two clips.

Inputs:

- `data/train/Cam03.mp4`, `data/train/Cam04.mp4`
- `pipeline/configs/pipeline.yaml`
- `pipeline/calibration/cam03.json`, `cam04.json`
- `pipeline/weights/yolo26n.pt`, `yolo26n-pose.pt`

## What the notebook does

1. Loads and validates the YAML config with Pydantic.
2. Runs YOLO `yolo26n` person detection + ByteTrack IDs at `sample_fps`. One fresh
   tracker per video, so IDs are video-local (`local_id`). At 5 fps on the 24 fps
   source the effective rate is ~4.8 fps.
3. Computes per-face floor distance and bearing from each detection's bottom-centre
   point using the calibration. `face_zone_state` applies the 4 m radius and an
   optional front-half-plane gate using `screen_normal_deg` (0 = up, 90 = right,
   180 = down, 270 = left; the normal points from the screen into the viewing side).
4. Treats Camera-03's two pillar faces (left/blue + right/orange) as **one combined
   screen**. Foot traffic and dwell use the union of both face zones; exposure runs
   are merged across faces so a shopper is not double-counted.
5. Runs pose (`yolo26n-pose`) only on frames containing an in-zone detection. Each
   in-zone detection is matched to a pose with Hungarian IoU assignment.
6. Computes `head_yaw_deg` as a pose-only proxy: nose offset from the eye/ear
   midpoint. Positive yaw = nose shifted to image-right. A run is qualified only
   when `|yaw - bearing_to_screen| <= facing_tolerance_deg`.
7. Falls back to a posture diagnostic (`stopped + head present + not head-down`) only
   for display/audit. Posture-only facing is **not** counted in the SEI.
8. Builds dwell and exposure events:
   - `dwell_i = in-zone frames / effective sample FPS` (union across Camera-03 faces)
   - exposure run = contiguous qualified frames, gap-bridged up to `max_gap_s`,
     kept only if duration `>= min_exposure_s`
   - foot traffic = unique tracks with `dwell_i > 0`
   - qualified views = unique exposed ByteTrack IDs by default
     (`qualified_view_mode: unique_shopper`); `exposure_run` counts every run
   - exposure rate = `qualified unique shoppers / foot_traffic * 100` (0–100 %)
   - SEI = qualified unique shoppers over the shared 30 s window
9. Produces the **raw 30 s SEI table** (no hourly extrapolation), in-zone track audit,
   event audit, yaw-source diagnostics, calibration overlay, and distance timelines.
10. Writes the run outputs under `artifacts/pipeline/`.

## Important definitions and limits

- A “shopper” is currently a **unique ByteTrack ID**, not a true cross-camera or
  re-identified person. ByteTrack fragmentation can still double-count one person.
- Foot traffic is dwell-gated: one in-zone frame is enough. Brief edge crossings and
  ID fragments can inflate it; the in-zone track audit shows raw IDs vs substantive
  (≥ 5 s) visitors.
- The SEI table is for the shared 30 s window only. Two 30 s clips cannot support an
  hourly SEI, confidence intervals, or pricing claims.
- Calibration polygons and `pixels_per_meter: 100` are sample-local and provisional.
  Use the calibration overlay cell to re-check them.
- `keypoint_conf` is `0.20` for this toy footage because small heads score low.
  Re-tune it on pilot data; keep the qualified-view rule pose-yaw-only.

Tune in `pipeline/configs/pipeline.yaml` (`conf`, `imgsz`, `match_iou`,
`keypoint_conf`, `min_head_px`, `facing_tolerance_deg`, `min_exposure_s`,
`qualified_view_mode`, `max_gap_s`, `require_front_half`). Re-trace the calibration
polygons when the camera or screen changes.

See `pipeline/CONFIG_REFERENCE.md` for typical dwell/attention ranges, external
viewability references, and recommended values for every config setting.

## Output

`artifacts/pipeline/` after a run:

```
sei_table_30s.csv    rank, screen, window, foot traffic, median dwell,
                     qualified views, raw exposure runs, unique exposed shoppers,
                     exposure rate, SEI per 30 s
exposure_events.csv  per-event audit: track, start/end, duration, distance, yaw, face
track_metrics.csv    per-track dwell, in-zone flag, exposure runs, qualified/facing frames
detections.csv       per-frame detection stream: boxes, distance, bearing, yaw, source
run_meta.json        generated_at, git SHA, window, config, calibrations, clips, rules
```

## Layout

```
pipeline/run_pipeline.ipynb       pipeline workspace (source of truth, self-contained)
pipeline/configs/pipeline.yaml    sample_fps, thresholds, video → screen/calibration map
pipeline/calibration/cam03.json   Camera-03 sample-local geometry (two faces, combined)
pipeline/calibration/cam04.json   Camera-04 sample-local geometry (single face)
pipeline/labels/gt_example.json   GT format example → gt_persons + gt_facing_intervals
pipeline/weights/                 yolo26n + yolo26n-pose weights
pipeline/CONFIG_REFERENCE.md      dwell/attention benchmarks + config guidance
```
