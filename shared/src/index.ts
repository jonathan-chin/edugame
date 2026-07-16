/**
 * @edugame/shared — the single source of truth imported by the API and both clients.
 */

export * from "./rng.js";
export * from "./content.js";
export * from "./question.js";
export * from "./stats.js";
export * from "./distributions.js";
export * from "./svg.js";
export * from "./analytics.js";
export * from "./profanity.js";
export * from "./state.js";
export * from "./ws-protocol.js";
export * from "./modules/index.js";
export * from "./modules/boxplot-common.js";

/** Bumped alongside meaningful changes; written into each session manifest. */
export const APP_VERSION = "0.3.0";
