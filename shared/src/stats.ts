/**
 * Spread categories shared by the standard-deviation modules. The ranges are tuned so the
 * four levels look clearly different on a fixed x-domain and, at the largest level, still
 * fit within it for every distribution shape.
 */

export type StdevCategory = "near-zero" | "small" | "large" | "very-large";

export interface StdevCategoryDef {
  id: StdevCategory;
  label: string;
  /** Inclusive range a concrete standard deviation is sampled from. */
  range: [number, number];
}

export const STDEV_CATEGORIES: readonly StdevCategoryDef[] = [
  { id: "near-zero", label: "Near-zero standard deviation", range: [0.2, 0.45] },
  { id: "small", label: "Small standard deviation", range: [0.9, 1.5] },
  { id: "large", label: "Large standard deviation", range: [2.6, 3.4] },
  { id: "very-large", label: "Very large standard deviation", range: [4.5, 5.5] },
];

export function stdevCategory(id: StdevCategory): StdevCategoryDef {
  const def = STDEV_CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown stdev category: ${id}`);
  return def;
}

/** Round to a fixed number of decimals without floating-point cruft. */
export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
