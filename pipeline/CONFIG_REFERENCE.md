# Config reference — current pipeline notebook

Reference for `pipeline/configs/pipeline.yaml`, the calibration JSONs, and what the
notebook actually does. The current run is **two 30 s toy clips**; production values
need pilot data.

## 1. Current setup at a glance

| Item | Current |
|---|---|
| Clips | `data/train/Cam03.mp4`, `data/train/Cam04.mp4` — 30 s, 24 fps, 1280×720 |
| Screens | Camera-03 = one combined screen with two pillar faces; Camera-04 = one face |
| Sampling | `sample_fps: 5` requested; ~4.8 fps effective on 24 fps source |
| Zone | 4 m radius + front half-plane (`require_front_half: true`) |
| Facing | pose-yaw proxy; qualified when `|relative_yaw| <= 60°` |
| Minimum exposure | 1.0 s continuous; gaps up to 0.4 s bridged |
| Qualified views | unique exposed ByteTrack IDs (`qualified_view_mode: unique_shopper`) |
| Foot traffic | unique in-zone ByteTrack IDs (`dwell_i > 0`) |
| Output | raw 30 s SEI table + audits under `artifacts/pipeline/` |
| Not included | training, Postgres writes, hourly extrapolation, production scoring |

## 2. Config keys

`pipeline/configs/pipeline.yaml`:

| Key | Current | Used for |
|---|---:|---|
| `sample_fps` | `5` | Frame sampling. `frame_step = round(video_fps / sample_fps)`; durations use the **effective** rate (`frame_step / video_fps`). |
| `detector` | `yolo26n` | Metadata only; the notebook currently loads `weights_dir/yolo26n.pt` directly. |
| `weights_dir` | `pipeline/weights` | Weight directory. |
| `imgsz` | `416` | Inference size for both detector and pose. |
| `conf` | `0.30` | Person detector confidence. |
| `pose` | `yolo26n-pose` | Metadata only; the notebook loads `weights_dir/yolo26n-pose.pt` directly. |
| `pose_conf` | `0.35` | Pose model confidence. |
| `keypoint_conf` | `0.20` | Minimum keypoint confidence for `head_yaw_deg`. Toy-tuned; use 0.35–0.50 on production footage. |
| `min_head_px` | `6` | Minimum eye/ear head width for yaw. Toy-tuned; use 12–20 px at 720p for production. |
| `match_iou` | `0.30` | Minimum IoU for Hungarian detector→pose assignment. |
| `posture_still_px` | `50` | Max foot displacement over `posture_window_s` for the posture diagnostic. |
| `posture_window_s` | `2.0` | Look-back window for posture displacement. |
| `posture_head_conf` | `0.20` | Head-presence threshold for posture diagnostic. |
| `zone_radius_m` | `4` | In-zone radius from each face's `screen_foot_px`. |
| `facing_tolerance_deg` | `60` | Qualified when `|head_yaw - bearing_to_screen| <= 60°`. |
| `min_exposure_s` | `1.0` | Minimum duration of a continuous qualified run. |
| `qualified_view_mode` | `unique_shopper` | `unique_shopper` = one exposed track counts once; `exposure_run` = every run counts. |
| `max_gap_s` | `0.4` | Merge exposure runs separated by at most this gap. |
| `require_front_half` | `true` | Count only the half-plane in front of the screen normal. |
| `pixels_per_meter` | `100` | Default scale; each calibration face can override it. |
| `videos[]` | 2 entries | `file`, `calib`, `screen_code`, `screen_name`, `screen_location`, `iab_zone`. |
| `out_dir` | `artifacts/pipeline` | CSV/JSON output directory. |

`detector` and `pose` are present as config metadata, but the notebook currently
hardcodes the two weight filenames. Change the filenames or wire those fields before
swapping models.

## 3. Calibration keys

`pipeline/calibration/cam03.json` / `cam04.json`:

| Key | Meaning |
|---|---|
| `camera` | Camera label. |
| `image_size` | `[width, height]` used for perspective scaling. |
| `combined_faces` | `true` for Camera-03; union foot traffic/dwell across `faces[]`. |
| `faces[]` | One or more screen faces. |
| `faces[].name` | Face label (`left_blue`, `right_orange`, `drink`). |
| `faces[].screen_polygon` | Screen quad in image pixels (overlay only). |
| `faces[].screen_foot_px` | Floor foot point used for distance/bearing. |
| `faces[].screen_normal_deg` | Direction the screen faces: 0 = up, 90 = right, 180 = down, 270 = left. |
| `faces[].pixels_per_meter` | Per-face scale for the pixel-distance fallback. |
| `faces[].homography_3x3` | Optional; if present, `face_distance_m` maps foot points through it. |
| `zone_radius_m`, `facing_tolerance_deg`, `note` | Calibration metadata; the notebook uses the YAML config values for the rules. |

Camera-03 has two faces with the same foot point and opposite normals. `in_zone` is the
union of both face zones; exposure runs are merged across faces so a shopper is not
double-counted.

## 4. What the notebook computes

| Term | Current definition |
|---|---|
| Dwell | `in-zone frames / effective sample FPS`, union across Camera-03 faces. |
| Foot traffic | Unique tracks with `dwell_i > 0`. |
| Exposure run | Contiguous `qualified=True` frames, gap-bridged by `max_gap_s`, kept if duration `>= min_exposure_s`. |
| Qualified view | `unique_shopper`: one exposed track counts once. `exposure_run`: every run counts. |
| Exposure rate | `qualified views / foot_traffic * 100` (bounded 0–100 % in unique-shopper mode). |
| SEI | Qualified views over the shared 30 s window. |
| Head yaw | `asin(2 * (nose_x - eye/ear_mid_x) / head_width)`; positive = image-right. |
| Facing | `in_zone` + measured pose yaw within `±facing_tolerance_deg` of the screen bearing. |
| Posture | Diagnostic only: stopped + head present + not head-down. Never counted in SEI. |
| UNKNOWN | No usable pose yaw; not a qualified view. |

A “shopper” is currently a **unique ByteTrack ID**, not a re-identified person.
Fragmentation can still double-count. The in-zone track audit shows raw IDs versus
substantive (≥5 s) visitors.

## 5. Typical dwell / attention ranges

Planning ranges, not universal constants. Zone type and screen placement dominate.

| Context | Typical value | Source / note |
|---|---:|---|
| Aisle screen exposure while walking past | **5–15 s** | Herhausen et al., *In-Store Advertising with Digital Signage* (2026). |
| Average attention to digital signage | **3.5 s** (2020), **3.7 s** (2019) | Quividi iQ Index. |
| Attention range across studies | **1.5–27 s**, average **4.6 s**; some retail studies **0.6–3 s** | Invidis summary (2019). |
| In-view vs attention | in-view **17.6 s**, attention **0.7 s**; dynamic **0.9 s** | IWC 2013 digital-signage study. |
| Entrance / decompression zone | **a few seconds** | Shoppers are still adjusting and move faster. |
| Checkout / queue | **10–30 s** | Queue behavior; repo mock uses 24 s. |
| Circulation screen | **2–3 s** average | Ariadne venue-level ranges. |
| Captive screen | up to **~30 s** | Ariadne. |

Internal references: `web/src/lib/data/mock.ts` uses entrance **3.2 s**, in-aisle
**6.5 s**, checkout **24 s**; `web/src/lib/analytics.ts` targets dwell MAE **1.5 s**.
Current toy results: Camera-03 median **5.2 s** (all in-zone IDs) / **5.8 s** for the
five substantive visitors; Camera-04 median **1.7 s**.

## 6. Viewability references

| Rule | Reference | Current |
|---|---|---|
| Static viewability | **1 s**, 100 % of creative on screen | `min_exposure_s: 1.0` |
| Video viewability | **2 continuous seconds** | `1.0 s` is more lenient |
| DOOH audience impression | in-view + facing for **≥1 s** | matches the qualified-view rule |
| Viewable angle | up to **120° total** | `±60°` |
| Viewing distance | screen-size dependent; `sqrt(area) × 23`; a 2 MP/60° sensor vendor quotes **up to 4.2 m** | fixed `4 m` |

Sources:

- MRC OOH Measurement Standards (Dec 2025): 1 s static / 2 s video.  
  https://mediaratingcouncil.org/sites/default/files/Standards/MRC%20OOH%20Standards%20Combined_FINAL.pdf
- Quividi, *Human-Valid Audience Impressions*: 1 s qualified exposure, 120° viewable angle, distance formula.  
  https://quividi.com/human-valid-audience-impressions-a-proposal-for-cross-platform-viewability
- Quividi iQ Index (2020): 3.5 s average attention.  
  https://quividi.com/quividi-iq-index-sheds-light-on-the-evolution-of-attention-time-in-covid-times
- Herhausen, de Jong & Grewal (2026): 5–15 s aisle exposure.  
  https://journals.sagepub.com/doi/abs/10.1177/00222429251351578
- IWC 2013: in-view 17.6 s, attention 0.7 s.  
  http://eprints.fri.uni-lj.si/3225/4/FINAL_IWC_2013.pdf
- Invidis (2019): attention ranges.  
  https://invidis.com/sixteen-nine/2019/02/18/how-to-maximize-dwell-time-for-digital-signage
- ARSA DOOH meter: 4.2 m distance with 2 MP/60° sensor; attention threshold 1.0–1.5 s.  
  https://arsa.technology/products/arsa-ai-box-series/dooh-audience-meter

## 7. Recommended tuning posture

| Setting | Current | Recommendation |
|---|---:|---|
| `zone_radius_m` | 4.0 | **3–5 m** for shelf/endcap; measure it. |
| `facing_tolerance_deg` | 60 | **60°** for exposure; **30–45°** for stricter attention. |
| `min_exposure_s` | 1.0 | **1 s** static; **2 s** video. |
| `qualified_view_mode` | `unique_shopper` | Reach: `unique_shopper`. Frequency: `exposure_run`. |
| `sample_fps` | 5 | **5–10 fps**; 10–15 fps for short glances/gaze. |
| `max_gap_s` | 0.4 | At most one sampling interval. |
| `keypoint_conf` | 0.20 | **0.35–0.50** on production footage. |
| `min_head_px` | 6 | **12–20 px** at 720p. |
| `match_iou` | 0.30 | **0.30–0.50**. |
| `posture_*` | heuristic | Diagnostic only. |
| `pixels_per_meter` | 100 | Calibrate per camera; prefer measured homography. |
| Foot traffic | any in-zone ID | Report raw IDs + substantive IDs. |
| Median dwell | — | **4–8 s** aisle; **10–30 s** checkout; **2–4 s** entrance. |

## 8. How to tune on pilot data

1. Label 10–20 short clips: person boxes, entry/exit, facing intervals.
2. Sweep `facing_tolerance_deg ∈ {45, 60, 75}` and `min_exposure_s ∈ {0.5, 1.0, 2.0}`.
3. Score exposure F1, count error, median-dwell MAE, foot-traffic WAPE.
4. Freeze the winning config per camera before comparing screens.
5. Re-check `zone_radius_m` with a tape measure; a 4 m circle is only valid if the
   calibration scale is correct.

The binding constraint is **labelled exposure intervals**. With single-digit event
counts, confidence intervals overlap and ranking is not separable. Aim for ~50–100
exposure events per screen before treating SEI differences as real.
