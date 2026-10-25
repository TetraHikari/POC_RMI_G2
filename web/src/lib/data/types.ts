/**
 * Row shapes returned by a DataSource. They mirror the planned PostgreSQL
 * tables/views, so swapping mock → Postgres doesn't touch the UI.
 */

export interface Store {
  storeId: number;
  storeName: string;
}

export interface Screen {
  screenId: number;
  storeId: number;
  storeName: string;
  code: string;
  name: string;
  label: string;
  iabZone: string;
  cameraMount: "overhead" | "elevated";
}

/** v_hourly_screen_metrics */
export interface HourlyMetric {
  screenId: number;
  hourStart: string; // ISO local time, e.g. 2026-10-11T08:00:00
  footTraffic: number;
  exposureEvents: number;
  exposureRate: number;
  medianDwellS: number;
  medianExposureS: number;
}

export type Split = "dev" | "test";

export interface Clip {
  clipId: string;
  screenId: number;
  startTs: string;
  durationS: number;
  peak: "peak" | "off-peak";
  dayType: "weekday" | "weekend";
  lighting: "bright" | "dim";
  density: "low" | "medium" | "high";
  split: Split;
}

/** v_clip_validation: model output vs. human ground truth per clip */
export interface ClipScore extends Omit<Clip, "startTs"> {
  gtFootTraffic: number;
  modelFootTraffic: number;
  gtMedianDwellS: number;
  modelMedianDwellS: number;
  gtExposureEvents: number;
  modelExposureEvents: number;
  tp: number;
  fp: number;
  fn: number;
}

export type ErrorKind = "occlusion" | "id_switch" | "wrong_facing" | "other";
export type ErrorOutcome = "missed exposure" | "false exposure" | "count error";

/** error_tags */
export interface ErrorTag {
  errorId: number;
  clipId: string;
  screenId: number;
  split: Split;
  lighting: Clip["lighting"];
  density: Clip["density"];
  outcome: ErrorOutcome;
  kind: ErrorKind;
  tOffsetS: number;
  trackId: number;
}

export interface AgreementRow {
  measure: "clips_double_labelled" | "ft_mae" | "dwell_mae" | "exposure_kappa";
  value: number;
  unit: "clips" | "people_per_clip" | "s" | "kappa";
}

export type TrackState = "outside" | "in_zone" | "facing";

/** track_points (one row per person per sampled frame) */
export interface TrackPoint {
  trackId: number;
  tS: number;
  xM: number;
  yM: number;
  headYawDeg: number;
  state: TrackState;
}

export interface MeasurementConfig {
  zoneRadiusM: number;
  facingDeg: number;
  minExposureS: number;
  trackDt: number;
}

export interface DataSource {
  name: "mock" | "postgres";
  config: MeasurementConfig;
  stores(): Promise<Store[]>;
  screens(): Promise<Screen[]>;
  hourly(): Promise<HourlyMetric[]>;
  clips(): Promise<Clip[]>;
  clipScores(): Promise<ClipScore[]>;
  errors(): Promise<ErrorTag[]>;
  agreement(): Promise<AgreementRow[]>;
  trackPoints(clipId: string): Promise<TrackPoint[]>;
}
