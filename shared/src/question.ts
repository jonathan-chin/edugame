/**
 * The question-module contract.
 *
 * A module is a pluggable unit that knows how to generate one kind of question. It is
 * pure with respect to its RNG: given the same seeded RNG stream it produces identical
 * output, which is what keeps a session reproducible.
 *
 * A generated question has two halves:
 *   - `public`  — the `QuestionInstance` sent to students/projector. It deliberately
 *                 does NOT contain the correct answer.
 *   - `key`     — the `AnswerKey`, kept server-side, used to grade submissions and only
 *                 disclosed to clients when the educator reveals.
 */

import type { Content } from "./content.js";
import type { RNG } from "./rng.js";

export type AnswerFormat = "multiple-choice" | "value";

export interface AnswerOption {
  id: string;
  content: Content;
}

export interface QuestionInstance {
  id: string;
  /** The module (topic) this question belongs to — matches the selection modal. */
  moduleId: string;
  /**
   * Sub-skills this question exercises within its module, e.g. ["Graphical literacy"]. A question
   * may carry several skills, or none; a module usually tags one. Analytics counts an answer once
   * toward each listed skill, so the per-skill totals can exceed the answer total.
   */
  skills: string[];
  /** 1 (easiest) .. 5 (hardest). */
  difficulty: number;
  prompt: Content;
  answerFormat: AnswerFormat;
  /** Present when `answerFormat === "multiple-choice"`. */
  options?: AnswerOption[];
  /** Present when `answerFormat === "value"`; a display unit like "cm". */
  valueUnit?: string;
}

export type AnswerKey =
  | { format: "multiple-choice"; correctOptionId: string }
  | { format: "value"; correct: number; tolerance: number };

/**
 * What clients need in order to show the answer, minus the `questionId` the engine supplies.
 * A module produces this from its own key, so the engine never has to interpret a key itself.
 */
export interface RevealAnswer {
  /** For multiple-choice: the id of the correct option. */
  correctOptionId?: string;
  /** For value questions: the accepted value and tolerance. */
  correctValue?: number;
  tolerance?: number;
}

export interface GeneratedQuestion {
  public: QuestionInstance;
  key: AnswerKey;
}

export type Submission =
  | { format: "multiple-choice"; optionId: string }
  | { format: "value"; value: number };

export interface QuestionModule {
  id: string;
  /** Topic name shown in the module selection modal, e.g. "Standard deviation". */
  title: string;
  /** A concise label for compact UI like the analytics "by module" chart. */
  shortTitle: string;
  description: string;
  /**
   * Generate a question. A module may produce different sub-skill variants (each tagged
   * on the resulting instance's `skills`); which one is chosen is up to the module.
   */
  generate(rng: RNG): GeneratedQuestion;
  /**
   * Decide whether a submission answers this module's own key correctly. The engine never
   * inspects a key itself, so a module is free to use whatever key shape it likes — including
   * one the engine has never heard of.
   */
  grade(key: AnswerKey, submission: Submission): boolean;
  /** Turn this module's key into what clients need to show the answer on reveal. */
  reveal(key: AnswerKey): RevealAnswer;
}

/**
 * The standard grading and reveal for the two answer shapes the clients can render today. A
 * module using those shapes wires these straight in; a module inventing its own key writes its
 * own pair instead.
 */
export function gradeStandardAnswer(key: AnswerKey, sub: Submission): boolean {
  if (key.format === "multiple-choice" && sub.format === "multiple-choice") {
    return key.correctOptionId === sub.optionId;
  }
  if (key.format === "value" && sub.format === "value") {
    return Math.abs(key.correct - sub.value) <= key.tolerance;
  }
  return false;
}

export function revealStandardAnswer(key: AnswerKey): RevealAnswer {
  return key.format === "multiple-choice"
    ? { correctOptionId: key.correctOptionId }
    : { correctValue: key.correct, tolerance: key.tolerance };
}

/** A compact, CSV-safe string form of a submission. */
export function submissionToString(sub: Submission): string {
  return sub.format === "multiple-choice" ? sub.optionId : String(sub.value);
}
