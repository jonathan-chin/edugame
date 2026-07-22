/**
 * Distribution families for the standard-deviation modules.
 *
 * A module picks a family and a target standard deviation; `makeDistribution` builds the
 * probability density, measures its actual spread by numeric integration, and rescales it
 * so its standard deviation is *exactly* the target. That exactness is what keeps the
 * questions correct: "which has the largest σ?" has an unambiguous answer even though the
 * shapes differ wildly.
 *
 * The density is generated server-side and only its rendered SVG is sent to clients (see
 * svg.ts) — the dataset/pdf never crosses the wire.
 */

import type { RNG } from "@edugame/module-api";

export type FamilyId = "normal" | "skew" | "peaked" | "plateau" | "bimodal" | "heavy-tail";

/** Smooth single-peaked families, used by the "classify this one curve's spread" module. */
export const UNIMODAL_FAMILIES: readonly FamilyId[] = ["normal", "skew", "peaked"];

/**
 * Families whose visual spread tracks σ well enough to reason about by eye — used by the
 * standard-deviation modules. All are smooth curves (no angular rectangle/triangle edges).
 * `bimodal` (σ driven by the gap between peaks) and `heavy-tail` (σ driven by tails, not
 * the peak) are deliberately excluded: their standard deviation is hard to intuit.
 */
export const SPREAD_LEGIBLE_FAMILIES: readonly FamilyId[] = ["normal", "skew", "peaked", "plateau"];

/** Every family. bimodal/heavy-tail are available here for future (non-σ) modules. */
export const ALL_FAMILIES: readonly FamilyId[] = ["normal", "skew", "peaked", "plateau", "bimodal", "heavy-tail"];

/** The rendered x-domain for bell-style graphics. */
export const BELL_DOMAIN: [number, number] = [-12, 12];

export interface Distribution {
  pdf: (x: number) => number;
  /** Exact standard deviation (the target it was rescaled to). */
  sd: number;
  family: FamilyId;
}

const SQRT_2PI = Math.sqrt(2 * Math.PI);

function gauss(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * SQRT_2PI);
}

/** Standard normal CDF (Abramowitz & Stegun 7.1.26), used for the skew-normal family. */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

/**
 * Generalized-normal shape (unnormalized). p = 2 is a Gaussian; p > 2 rounds toward a
 * flat top (a smooth "plateau"); 1 < p < 2 is a sharper but still-smooth peak. For any
 * p > 1 the top is rounded, never cusped — so there are no angular edges.
 */
function genNormal(x: number, center: number, a: number, p: number): number {
  return Math.exp(-Math.pow(Math.abs(x - center) / a, p));
}

/**
 * The standard deviation of a density, by numeric integration over a wide range (wider
 * than the render domain, so tails that fall off-screen still count toward σ).
 */
function numericSd(pdf: (x: number) => number): number {
  const lo = -30;
  const hi = 30;
  const n = 1500;
  const step = (hi - lo) / n;
  let m0 = 0;
  let m1 = 0;
  let m2 = 0;
  for (let i = 0; i <= n; i++) {
    const x = lo + i * step;
    const w = i === 0 || i === n ? 0.5 : 1; // trapezoidal endpoints
    const f = pdf(x) * w;
    m0 += f;
    m1 += f * x;
    m2 += f * x * x;
  }
  const mean = m1 / m0;
  const variance = m2 / m0 - mean * mean;
  return Math.sqrt(Math.max(variance, 1e-9));
}

/** Build a family's density at roughly the requested scale, before exact rescaling. */
function buildBase(rng: RNG, family: FamilyId, scale: number, center: number): (x: number) => number {
  switch (family) {
    case "normal":
      return (x) => gauss(x, center, scale);
    case "skew": {
      const alpha = rng.pick([-6, -4, 4, 6]);
      return (x) => 2 * gauss(x, center, scale) * normalCdf((alpha * (x - center)) / scale);
    }
    case "peaked": {
      const p = rng.float(1.4, 1.8);
      return (x) => genNormal(x, center, scale, p);
    }
    case "plateau": {
      const p = rng.float(3, 4);
      return (x) => genNormal(x, center, scale, p);
    }
    case "bimodal": {
      const d = scale * 0.85;
      const cs = scale * 0.42;
      return (x) => 0.5 * gauss(x, center - d, cs) + 0.5 * gauss(x, center + d, cs);
    }
    case "heavy-tail":
      return (x) => 0.72 * gauss(x, center, scale * 0.55) + 0.28 * gauss(x, center, scale * 2.1);
  }
}

/**
 * Build a distribution of a random family whose standard deviation is exactly `targetSd`.
 * Rescaling about the center multiplies σ by a constant, so the shape is preserved while
 * the spread is pinned precisely.
 */
export function makeDistribution(rng: RNG, targetSd: number, families: readonly FamilyId[] = ALL_FAMILIES): Distribution {
  const family = rng.pick(families);
  const center = rng.float(-1, 1) * Math.min(targetSd * 0.1, 1.0);
  const base = buildBase(rng, family, targetSd, center);
  const sd0 = numericSd(base);
  const f = targetSd / sd0;
  const pdf = (x: number) => base(center + (x - center) / f) / f;
  return { pdf, sd: targetSd, family };
}
