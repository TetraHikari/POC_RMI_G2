import "server-only";

import { mockSource } from "./mock";
import { postgresSource } from "./postgres";
import type { DataSource } from "./types";

/**
 * Pick the backend with RMI_DATA_SOURCE: "mock" (default) or "postgres".
 * The Postgres source reads shopper_screen_events (see postgres.ts).
 */
export function getDataSource(): DataSource {
  const kind = process.env.RMI_DATA_SOURCE ?? "mock";
  if (kind === "mock") return mockSource;
  if (kind === "postgres") return postgresSource;
  throw new Error(`Unknown RMI_DATA_SOURCE=${kind}; use "mock" or "postgres"`);
}

export type * from "./types";
