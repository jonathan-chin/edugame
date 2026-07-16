/**
 * WebSocket message protocol.
 *
 * Two channels exist, distinguished by which port the socket connected on:
 *   - student/projector channel (tunneled port): receives game-state and reveal pushes
 *   - educator channel (localhost-only port): additionally receives live analytics
 *
 * Everything is one-way server -> client. Students submit answers over normal HTTP
 * POSTs (handled by TanStack Query); the socket only pushes shared state changes so
 * every screen updates the instant the educator acts.
 */

import type { AnalyticsSnapshot } from "./analytics.js";
import type { PublicGameState, RevealInfo } from "./state.js";

export interface VoteTally {
  questionId: string;
  /** optionId -> number of students currently on that option. */
  counts: Record<string, number>;
  total: number;
}

export type ServerMessage =
  | { type: "state"; state: PublicGameState }
  | { type: "reveal"; reveal: RevealInfo }
  | { type: "analytics"; snapshot: AnalyticsSnapshot }
  | { type: "votes"; tally: VoteTally }
  /** The educator ended the game and reset — students should return to the join screen. */
  | { type: "reset" }
  | { type: "ping" };

/**
 * Client -> server messages. `heartbeat` (carrying the student's token) is a liveness ping:
 * the server uses it to notice when a student has left — logged out, closed the tab, or
 * dropped off the network — and drop them from the roster after a short timeout.
 */
export type ClientMessage = { type: "pong" } | { type: "heartbeat"; token: string };

export const WS_PATH = "/ws";
