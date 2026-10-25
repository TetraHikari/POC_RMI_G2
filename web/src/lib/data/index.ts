import "server-only";

import { mockSource } from "./mock";
import type { DataSource } from "./types";

/**
 * Pick the backend with RMI_DATA_SOURCE: "mock" (default) or "postgres".
 * A Postgres source will implement the same DataSource interface over SQL views.
 */
export function getDataSource(): DataSource {
  const kind = process.env.RMI_DATA_SOURCE ?? "mock";
  if (kind === "mock") return mockSource;
  throw new Error(`RMI_DATA_SOURCE=${kind} is not implemented yet; use "mock"`);
}

export type * from "./types";
