/**
 * Turning loaded sessions into the report model.
 *
 * The model is deliberately render-agnostic — the same aggregation feeds the PDF and the
 * dashboard. It is layered most-aggregated first (class totals) down to the most granular
 * (a single student's answer to a single recreated question), matching how the reports read.
 */

import { getModule, type RecordedQuestion } from "@edugame/shared";
import { recordedText } from "./content.js";
import { canonical, loadOrCreateNameMap, type NameMap } from "./names.js";
import type { LoadedSession } from "./sessions.js";

export interface Group {
  key: string;
  label: string;
  answered: number;
  correct: number;
  accuracy: number; // 0..1
}

/** How the class answered one recreated question. */
export interface QuestionResult {
  question: RecordedQuestion;
  moduleLabel: string;
  sessionId: string;
  askedAt: string;
  answered: number;
  correct: number;
  accuracy: number;
  /** Every offered option with how many chose it, in the question's own order. */
  distribution: { optionId: string; label: string; count: number; isCorrect: boolean }[];
}

/** One student's answer to one question. */
export interface StudentAnswer {
  questionId: string;
  question: RecordedQuestion | null; // null if the manifest didn't record it
  sessionId: string;
  at: string;
  moduleId: string;
  moduleLabel: string;
  skills: string[];
  difficulty: number;
  chosenOptionId: string;
  chosenLabel: string | null;
  correctOptionId: string | null;
  correctLabel: string | null;
  isCorrect: boolean;
}

export interface StudentReport {
  name: string;
  sessionIds: string[];
  answered: number;
  correct: number;
  accuracy: number;
  byModule: Group[];
  bySkill: Group[];
  byDifficulty: Group[];
  answers: StudentAnswer[]; // chronological
}

/** The spread of per-student accuracies, computed once so student reports can place a score. */
export interface ClassDistribution {
  scores: number[]; // each student's accuracy, 0..1
  mean: number;
  stdev: number; // population standard deviation
}

export interface ClassReport {
  startedAt: Date;
  endedAt: Date;
  sessionCount: number;
  studentCount: number;
  answered: number;
  correct: number;
  accuracy: number;
  byModule: Group[];
  bySkill: Group[];
  byDifficulty: Group[];
  questions: QuestionResult[];
  /** Distinct questions put to the class across the range — the denominator for participation. */
  totalQuestions: number;
  roster: { name: string; answered: number; correct: number; accuracy: number }[];
  distribution: ClassDistribution;
}

export interface ReportModel {
  class: ClassReport;
  students: StudentReport[];
}

/** A flat answer with its resolved canonical name and the question it referred to. */
interface Answer {
  name: string;
  sessionId: string;
  at: string;
  moduleId: string;
  skills: string[];
  difficulty: number;
  submission: string;
  isCorrect: boolean;
  question: RecordedQuestion | null;
}

const moduleLabel = (id: string) => getModule(id)?.shortTitle ?? id;

function acc(answered: number, correct: number): number {
  return answered > 0 ? correct / answered : 0;
}

/**
 * Group answers by the keys each one carries, producing accuracy rows sorted by label. An answer
 * contributes once per distinct key (so a two-skill question counts toward both skills, a
 * skill-less one toward none) — hence keys are drawn as an array.
 */
function groupBy(answers: Answer[], keysOf: (a: Answer) => string[], labelOf: (key: string) => string): Group[] {
  const buckets = new Map<string, { answered: number; correct: number }>();
  for (const a of answers) {
    for (const k of new Set(keysOf(a))) {
      const b = buckets.get(k) ?? { answered: 0, correct: 0 };
      b.answered++;
      if (a.isCorrect) b.correct++;
      buckets.set(k, b);
    }
  }
  return [...buckets.entries()]
    .map(([key, b]) => ({ key, label: labelOf(key), answered: b.answered, correct: b.correct, accuracy: acc(b.answered, b.correct) }))
    .sort((x, y) => x.label.localeCompare(y.label));
}

function optionLabel(q: RecordedQuestion | null, optionId: string): string | null {
  const opt = q?.options?.find((o) => o.id === optionId);
  return opt ? recordedText(opt.content) ?? null : null;
}

function correctOptionId(q: RecordedQuestion | null): string | null {
  return q && q.correct.format === "multiple-choice" ? q.correct.correctOptionId : null;
}

export function buildModel(sessions: LoadedSession[], sessionsDir: string): ReportModel {
  // Resolve every answer's canonical name (per-session map) and attach its recorded question.
  const questionById = new Map<string, RecordedQuestion>();
  for (const s of sessions) for (const q of s.questions) questionById.set(q.id, q);

  const answers: Answer[] = [];
  for (const s of sessions) {
    const observed = [...new Set(s.rows.map((r) => r.studentName))];
    const map: NameMap = loadOrCreateNameMap(sessionsDir, s.id, observed);
    for (const r of s.rows) {
      answers.push({
        name: canonical(map, r.studentName),
        sessionId: s.id,
        at: r.timestamp,
        moduleId: r.moduleId,
        skills: r.skills,
        difficulty: r.difficulty,
        submission: r.submission,
        isCorrect: r.isCorrect === 1,
        question: questionById.get(r.questionId) ?? null,
      });
    }
  }

  const startedAt = sessions.reduce((min, s) => (s.startedAt < min ? s.startedAt : min), sessions[0]?.startedAt ?? new Date(0));
  const endedAt = sessions.reduce((max, s) => (s.startedAt > max ? s.startedAt : max), sessions[0]?.startedAt ?? new Date(0));

  // Students are built once and reused for the class roster and distribution, so nothing is
  // aggregated twice.
  const students = buildStudents(answers);
  const classReport = buildClass(sessions, answers, questionById, students, startedAt, endedAt);
  return { class: classReport, students };
}

/** Mean and population standard deviation of the students' accuracies. */
function classDistribution(students: StudentReport[]): ClassDistribution {
  const scores = students.map((s) => s.accuracy);
  const n = scores.length;
  const mean = n ? scores.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n ? scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n : 0;
  return { scores, mean, stdev: Math.sqrt(variance) };
}

function buildClass(
  sessions: LoadedSession[],
  answers: Answer[],
  questionById: Map<string, RecordedQuestion>,
  students: StudentReport[],
  startedAt: Date,
  endedAt: Date,
): ClassReport {
  const correct = answers.filter((a) => a.isCorrect).length;

  // Per-question distribution, grouped by the generated question id (unique per question).
  const byQuestion = new Map<string, Answer[]>();
  for (const a of answers) {
    // Recover the questionId: an answer knows its question object, but not directly its id here,
    // so re-key from the row via the question. Answers whose question wasn't recorded are skipped
    // from the per-question view (they still count in every total above).
    const id = a.question?.id;
    if (!id) continue;
    (byQuestion.get(id) ?? byQuestion.set(id, []).get(id)!).push(a);
  }
  const questions: QuestionResult[] = [...byQuestion.entries()]
    .map(([id, group]) => {
      const q = questionById.get(id)!;
      const cid = correctOptionId(q);
      const counts = new Map<string, number>();
      for (const a of group) counts.set(a.submission, (counts.get(a.submission) ?? 0) + 1);
      const distribution = (q.options ?? []).map((o) => ({
        optionId: o.id,
        label: recordedText(o.content) ?? o.id,
        count: counts.get(o.id) ?? 0,
        isCorrect: o.id === cid,
      }));
      const c = group.filter((a) => a.isCorrect).length;
      return {
        question: q,
        moduleLabel: moduleLabel(q.moduleId),
        sessionId: group[0]!.sessionId,
        askedAt: group.reduce((min, a) => (a.at < min ? a.at : min), group[0]!.at),
        answered: group.length,
        correct: c,
        accuracy: acc(group.length, c),
        distribution,
      };
    })
    .sort((a, b) => a.askedAt.localeCompare(b.askedAt));

  // `students` is already sorted by name; the roster keeps that order.
  const roster = students.map((s) => ({ name: s.name, answered: s.answered, correct: s.correct, accuracy: s.accuracy }));

  // Every distinct question the class was put through: the union of questions recorded in the
  // manifests and any answered in the CSV (in case a session ended before a question's reveal).
  const askedIds = new Set<string>();
  for (const s of sessions) {
    for (const q of s.questions) askedIds.add(q.id);
    for (const r of s.rows) askedIds.add(r.questionId);
  }

  return {
    startedAt,
    endedAt,
    sessionCount: sessions.length,
    studentCount: students.length,
    answered: answers.length,
    correct,
    accuracy: acc(answers.length, correct),
    byModule: groupBy(answers, (a) => [a.moduleId], moduleLabel),
    bySkill: groupBy(answers, (a) => a.skills, (k) => k),
    byDifficulty: groupBy(answers, (a) => [String(a.difficulty)], (k) => `Difficulty ${k}`),
    questions,
    totalQuestions: askedIds.size,
    roster,
    distribution: classDistribution(students),
  };
}

function buildStudents(answers: Answer[]): StudentReport[] {
  const byName = new Map<string, Answer[]>();
  for (const a of answers) (byName.get(a.name) ?? byName.set(a.name, []).get(a.name)!).push(a);

  return [...byName.entries()]
    .map(([name, group]) => {
      const chronological = [...group].sort((a, b) => a.at.localeCompare(b.at));
      const correct = group.filter((a) => a.isCorrect).length;
      return {
        name,
        sessionIds: [...new Set(group.map((a) => a.sessionId))],
        answered: group.length,
        correct,
        accuracy: acc(group.length, correct),
        byModule: groupBy(group, (a) => [a.moduleId], moduleLabel),
        bySkill: groupBy(group, (a) => a.skills, (k) => k),
        byDifficulty: groupBy(group, (a) => [String(a.difficulty)], (k) => `Difficulty ${k}`),
        answers: chronological.map((a): StudentAnswer => {
          const cid = correctOptionId(a.question);
          return {
            questionId: a.question?.id ?? "",
            question: a.question,
            sessionId: a.sessionId,
            at: a.at,
            moduleId: a.moduleId,
            moduleLabel: moduleLabel(a.moduleId),
            skills: a.skills,
            difficulty: a.difficulty,
            chosenOptionId: a.submission,
            chosenLabel: optionLabel(a.question, a.submission),
            correctOptionId: cid,
            correctLabel: cid ? optionLabel(a.question, cid) : null,
            isCorrect: a.isCorrect,
          };
        }),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
