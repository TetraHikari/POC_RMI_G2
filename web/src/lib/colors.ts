/** Categorical slot i (0-based) as a CSS var, so light/dark swap without JS. */
export const series = (i: number) => `var(--series-${(i % 8) + 1})`;

/** Color follows the screen, never its rank: slot = position in the full screen list. */
export function screenColor(screenId: number, allIds: number[]): string {
  return series([...allIds].sort((a, b) => a - b).indexOf(screenId));
}
