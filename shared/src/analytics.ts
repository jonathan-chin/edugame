/**
 * Analytics data shapes and the CSV contract.
 *
 * Two artifacts are written per session (see COLLABORATION.md for the rationale):
 *   - `<session>.csv`      — one row per graded answer event (flat, spreadsheet-ready)
 *   - `<session>.meta.json` — session-level facts, including the reproducibility seed
 *
 * The CSV header order is defined here so the writer (api) and any reader agree on it.
 */

import type { RecordedQuestion } from "./recording.js";

export interface AnswerEventRow {
  timestamp: string; // ISO 8601
  session: string;
  studentToken: string;
  studentName: string;
  questionId: string;
  moduleId: string;
  /** The question's sub-skills; serialized pipe-joined in the single `skills` CSV column. */
  skills: string[];
  difficulty: number;
  submission: string;
  isCorrect: 0 | 1;
}

/** Column order for the CSV. Keys must match `AnswerEventRow`. */
export const ANSWER_CSV_COLUMNS: readonly (keyof AnswerEventRow)[] = [
  "timestamp",
  "session",
  "studentToken",
  "studentName",
  "questionId",
  "moduleId",
  "skills",
  "difficulty",
  "submission",
  "isCorrect",
];

/** Skills serialize as a pipe-joined string in one column — no comma, so it never needs quoting. */
export const SKILLS_CSV_SEPARATOR = "|";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvHeaderLine(): string {
  return ANSWER_CSV_COLUMNS.join(",");
}

export function answerRowToCsv(row: AnswerEventRow): string {
  return ANSWER_CSV_COLUMNS.map((c) => csvEscape(c === "skills" ? row.skills.join(SKILLS_CSV_SEPARATOR) : row[c])).join(",");
}

/** Parse the pipe-joined `skills` cell back to an array (empty cell → no skills). */
export function parseSkillsCell(cell: string): string[] {
  return cell ? cell.split(SKILLS_CSV_SEPARATOR).filter(Boolean) : [];
}

export interface SessionManifest {
  session: string;
  seed: string;
  appVersion: string;
  startedAt: string;
  endedAt: string | null;
  modulesUsed: string[];
  studentCount: number;
  questionCount: number;
  /** Every question revealed to the class, captured at reveal time (graphics live in sidecar
   *  files under `sessions/<session>/`, referenced by path). Empty until the first reveal. */
  questions: RecordedQuestion[];
}

// ---- Aggregated views (computed live, sent to the educator client) ----

export interface StudentStat {
  token: string;
  name: string;
  answered: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
}

export interface GroupStat {
  key: string; // category name, skill name, or moduleId
  label: string;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface AnalyticsSnapshot {
  session: string;
  totalAnswers: number;
  overallAccuracy: number;
  students: StudentStat[];
  byModule: GroupStat[];
  bySkill: GroupStat[];
}
