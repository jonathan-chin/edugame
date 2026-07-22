/**
 * The public game state shared between the server, the student clients, and the
 * projector view. It never contains the answer key — that is disclosed separately on
 * reveal (see the WebSocket protocol).
 */

import type { QuestionInstance, RevealAnswer } from "./question.js";

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
  /**
   * Students currently *connected* — heartbeating within the last few seconds. A student whose
   * phone locks drops out of this count but stays enrolled, keeping their token and any answer
   * they already submitted; they reappear when their screen comes back on.
   */
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
export interface RevealInfo extends RevealAnswer {
  questionId: string;
}

/**
 * One answered question in a student's session history, newest first.
 *
 * The text fields are a lightweight fallback: the client re-renders the *real* question
 * (charts and all) from the copy it cached when the question was live, looking it up by
 * `questionId`, and marks `myOptionId` / `correctOptionId`. The text is what's shown when
 * that cache misses (e.g. the student joined after this question had already been asked).
 */
export interface StudentHistoryItem {
  questionId: string;
  /** ISO timestamp of the reveal that graded this answer. */
  at: string;
  moduleId: string;
  /** The module's short title, for display. */
  moduleLabel: string;
  skills: string[];
  difficulty: number;
  isCorrect: boolean;
  myOptionId?: string;
  correctOptionId?: string;
  promptText?: string;
  myAnswerText?: string;
  correctAnswerText?: string;
  /**
   * Every option the question offered. The history row only renders the student's answer and
   * the correct one, but the full set is carried so a richer review (distractor analysis, "show
   * all options") needs no server change.
   */
  options: { id: string; text?: string }[];
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
  /** Every question this student answered this session, newest first. */
  history: StudentHistoryItem[];
}
