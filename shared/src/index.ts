/**
 * @edugame/shared — the game-level types the API and both clients agree on: live state, the
 * WebSocket protocol, analytics, the session recording, and name checking.
 *
 * It re-exports `@edugame/module-api` because those contract types (Content, QuestionInstance,
 * RevealInfo and friends) travel over the same wire. It deliberately does **not** export any
 * question module: an application composes those itself from `@edugame/modules`, so nothing in
 * the core depends on which modules exist.
 */

export * from "@edugame/module-api";
export * from "./analytics.js";
export * from "./recording.js";
export * from "./profanity.js";
export * from "./state.js";
export * from "./ws-protocol.js";

/** Bumped alongside meaningful changes; written into each session manifest. */
export const APP_VERSION = "0.5.0";
