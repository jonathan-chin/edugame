/**
 * Shared generation helper for the two box-and-whisker modules.
 */

import { type RNG } from "@edugame/module-api";
import type { FiveNumber } from "./svg.js";

export const BOXPLOT_DOMAIN: [number, number] = [0, 100];

export type FiveNumberKey = "min" | "q1" | "median" | "q3" | "max";

export const FIVE_NUMBER_LABELS: Record<FiveNumberKey, string> = {
  min: "minimum",
  q1: "first quartile (Q1)",
  median: "median (Q2)",
  q3: "third quartile (Q3)",
  max: "maximum",
};

/**
 * Build a valid five-number summary with min < q1 < median < q3 < max, kept inside the
 * fixed domain so all generated plots are directly comparable on one axis. No outliers.
 */
export function buildBoxPlot(rng: RNG): FiveNumber {
  const min = rng.int(2, 22);
  const q1 = min + rng.int(4, 14);
  const median = q1 + rng.int(4, 14);
  const q3 = median + rng.int(4, 14);
  const max = q3 + rng.int(4, 14);
  return { min, q1, median, q3, max };
}
