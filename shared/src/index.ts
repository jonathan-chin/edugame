/**
 * @edugame/shared — the single source of truth imported by the API and both clients.
 */

export * from "./rng.js";
export * from "./content.js";
export * from "./question.js";
export * from "./registry.js";
export * from "./stats.js";
export * from "./distributions.js";
export * from "./svg.js";
export * from "./analytics.js";
export * from "./recording.js";
export * from "./profanity.js";
export * from "./state.js";
export * from "./ws-protocol.js";
// The module *registry* is public; individual modules' internals are not. A module's helpers stay
// private to that module, so the core's public surface never depends on one module's shape.
export * from "./modules/index.js";

/** Bumped alongside meaningful changes; written into each session manifest. */
export const APP_VERSION = "0.5.0";
