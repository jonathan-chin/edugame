/**
 * The public game state shared between the server, the student clients, and the
 * projector view. It never contains the answer key — that is disclosed separately on
 * reveal (see the WebSocket protocol).
 */

import type { QuestionInstance } from "./question.js";

export type Phase = "lobby" | "question" | "revealed";

export interface PublicGameState {
  session: string;
  phase: Phase;
  /** The current question with its answer key stripped. Null in the lobby. */
  question: QuestionInstance | null;
  /** 1-based index of the current question within the session. 0 in the lobby. */
  questionNumber: number;
  /** True once revealed: students can no longer submit or change answers. */
  locked: boolean;
  activeModuleId: string | null;
  studentCount: number;
  /** How many students have a submitted answer for the current question. */
  answeredCount: number;
  /** Per-question auto-reveal length in seconds; 0 when no timer is configured. */
  timerSeconds: number;
  /**
   * Epoch ms at which the current question auto-reveals, or null when untimed or not in a
   * question. Clients render a countdown from this; the server is what actually enforces it.
   */
  questionEndsAt: number | null;
  /**
   * The server clock (epoch ms) at the moment this state was produced. Clients use it to
   * correct `questionEndsAt` for any skew between the server clock and the device clock.
   */
  serverNow: number;
}

/** What is disclosed to clients when the educator reveals the answer. */
export interface RevealInfo {
  questionId: string;
  /** For multiple-choice: the id of the correct option. */
  correctOptionId?: string;
  /** For value questions: the accepted value and tolerance. */
  correctValue?: number;
  tolerance?: number;
}

/** A student's own progress view (basic + category/skill breakdowns). */
export interface StudentProgress {
  token: string;
  name: string;
  answered: number;
  correct: number;
  accuracy: number;
  byModule: { label: string; answered: number; correct: number; accuracy: number }[];
  bySkill: { label: string; answered: number; correct: number; accuracy: number }[];
}
