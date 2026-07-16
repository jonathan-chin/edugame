/**
 * In-memory model of a single live game session.
 *
 * There is exactly one of these per running server (the "one session, name only" model
 * the human chose). It owns the seeded RNG, the current generated question (with its
 * answer key, which never leaves the server until reveal), the roster, and the graded
 * answer events that feed both the CSV log and the live analytics.
 */

import { randomUUID } from "node:crypto";
import {
  APP_VERSION,
  type AnalyticsSnapshot,
  type AnswerEventRow,
  type AnswerKey,
  createRng,
  type GeneratedQuestion,
  getModule,
  grade,
  type GroupStat,
  MODULES,
  type Phase,
  type PublicGameState,
  type RevealInfo,
  type RNG,
  type SessionManifest,
  type StudentProgress,
  type StudentStat,
  type Submission,
  submissionToString,
  type VoteTally,
} from "@edugame/shared";

interface StudentRecord {
  token: string;
  name: string;
  joinedAt: string;
}

export interface RevealResult {
  rows: AnswerEventRow[];
  reveal: RevealInfo;
}

export class GameSession {
  readonly sessionId: string;
  readonly seed: string;
  private readonly rng: RNG;
  private readonly startedAt = new Date().toISOString();
  private endedAt: string | null = null;

  private phase: Phase = "lobby";
  private questionNumber = 0;
  private activeModuleId: string | null = null;
  private current: GeneratedQuestion | null = null;
  /** Modules new questions are drawn from at random. Defaults to all. */
  private modulePool: string[] = MODULES.map((m) => m.id);
  /** Per-question auto-reveal length in seconds; 0 disables the timer (manual reveal). */
  private timerSeconds = 0;
  /** Epoch ms when the current question auto-reveals, or null when untimed. */
  private questionDeadline: number | null = null;

  private readonly students = new Map<string, StudentRecord>();
  private readonly currentAnswers = new Map<string, Submission>();
  private readonly modulesUsed = new Set<string>();
  private readonly events: AnswerEventRow[] = [];

  constructor(sessionId: string, seed: string) {
    this.sessionId = sessionId;
    this.seed = seed;
    this.rng = createRng(seed);
  }

  // ---- roster ----

  /** Register a student and return their opaque token. The display name must be unique
   *  (case-insensitive) among the students who have joined this session; a collision is
   *  rejected so two people can't share a name. */
  join(name: string): { token: string; name: string } {
    const taken = [...this.students.values()].some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (taken) throw new HttpError(409, "That name is already taken", "name-taken");
    const token = randomUUID();
    this.students.set(token, { token, name, joinedAt: new Date().toISOString() });
    return { token, name };
  }

  hasStudent(token: string): boolean {
    return this.students.has(token);
  }

  /** Tokens of every student currently on the roster. */
  studentTokens(): string[] {
    return [...this.students.keys()];
  }

  /** Remove a student (their logout): frees the name for reuse, invalidates the token, and
   *  drops any pending answer for the current question. Already-graded events are left in
   *  place — the CSV is the durable record, so aggregate stats stay stable. */
  removeStudent(token: string): void {
    this.students.delete(token);
    this.currentAnswers.delete(token);
  }

  // ---- flow control (educator) ----

  /** Generate a fresh question for the current slot: picks a module, opens answering, and
   *  clears any prior submissions. Does NOT touch the question number. */
  private drawQuestion(moduleId?: string): void {
    // An explicit module wins; otherwise draw one from the pool with the seeded RNG so the
    // random choice is reproducible from the session seed.
    const pool = this.modulePool.length ? this.modulePool : MODULES.map((m) => m.id);
    const id = moduleId ?? this.rng.pick(pool);
    const module = getModule(id);
    if (!module) throw new HttpError(400, `Unknown module: ${id}`);

    this.activeModuleId = id;
    this.modulesUsed.add(id);
    this.current = module.generate(this.rng);
    this.phase = "question";
    this.currentAnswers.clear();
    // Wall-clock only (never touches the RNG), so reproducibility is unaffected.
    this.questionDeadline = this.timerSeconds > 0 ? Date.now() + this.timerSeconds * 1000 : null;
  }

  /** Advance to the next question (starts the game, or moves on after a reveal). */
  nextQuestion(moduleId?: string): void {
    this.questionNumber += 1;
    this.drawQuestion(moduleId);
  }

  /**
   * Replace the current, un-revealed question with a completely new one. Keeps the same
   * question number and discards any answers already submitted for it (they were never
   * graded or written, since that only happens on reveal).
   */
  skipQuestion(moduleId?: string): void {
    if (this.phase !== "question" || !this.current) {
      throw new HttpError(409, "No active question to skip");
    }
    this.drawQuestion(moduleId);
  }

  /** Replace the pool of modules new questions are drawn from. */
  setModulePool(ids: string[]): void {
    const valid = ids.filter((id) => getModule(id));
    if (valid.length === 0) throw new HttpError(400, "Select at least one module");
    this.modulePool = valid;
  }

  getModulePool(): string[] {
    return [...this.modulePool];
  }

  /** Set the per-question auto-reveal timer in seconds (0 disables it). Applies to the
   *  next question drawn; the current question keeps whatever deadline it started with. */
  setTimer(seconds: number): void {
    if (!Number.isFinite(seconds)) throw new HttpError(400, "Timer must be a number");
    this.timerSeconds = Math.max(0, Math.min(3600, Math.floor(seconds)));
  }

  getTimer(): number {
    return this.timerSeconds;
  }

  /** Epoch ms when the current question auto-reveals, or null when there is no live timer. */
  getQuestionDeadline(): number | null {
    return this.phase === "question" ? this.questionDeadline : null;
  }

  reveal(): RevealResult {
    if (!this.current || this.phase !== "question") {
      throw new HttpError(409, "No open question to reveal");
    }
    this.phase = "revealed";
    this.questionDeadline = null;

    const key = this.current.key;
    const q = this.current.public;
    const now = new Date().toISOString();
    const rows: AnswerEventRow[] = [];

    for (const [token, submission] of this.currentAnswers) {
      const student = this.students.get(token);
      if (!student) continue;
      const isCorrect = grade(key, submission) ? 1 : 0;
      rows.push({
        timestamp: now,
        session: this.sessionId,
        studentToken: token,
        studentName: student.name,
        questionId: q.id,
        moduleId: q.moduleId,
        skill: q.skill,
        difficulty: q.difficulty,
        submission: submissionToString(submission),
        isCorrect,
      });
    }

    this.events.push(...rows);
    return { rows, reveal: this.revealInfo(key, q.id) };
  }

  private revealInfo(key: AnswerKey, questionId: string): RevealInfo {
    if (key.format === "multiple-choice") {
      return { questionId, correctOptionId: key.correctOptionId };
    }
    return { questionId, correctValue: key.correct, tolerance: key.tolerance };
  }

  /**
   * The reveal info for the current question if it has already been revealed, else null.
   * The reveal is otherwise a one-time push, so this lets a client that connects or
   * reconnects *after* the reveal (e.g. a student refreshing their tab) still show the
   * correct answer instead of a locked question with no answer marked.
   */
  currentReveal(): RevealInfo | null {
    if (this.phase !== "revealed" || !this.current) return null;
    return this.revealInfo(this.current.key, this.current.public.id);
  }

  end(): void {
    this.endedAt = new Date().toISOString();
  }

  // ---- student answering ----

  submit(token: string, submission: Submission): void {
    if (!this.current || this.phase !== "question") {
      throw new HttpError(409, "Answers are not being accepted right now");
    }
    if (!this.students.has(token)) {
      throw new HttpError(401, "Unknown student token");
    }
    const q = this.current.public;
    if (q.answerFormat === "multiple-choice") {
      if (submission.format !== "multiple-choice") throw new HttpError(400, "Expected a multiple-choice answer");
      const valid = q.options?.some((o) => o.id === submission.optionId);
      if (!valid) throw new HttpError(400, "Unknown option");
    } else if (submission.format !== "value") {
      throw new HttpError(400, "Expected a value answer");
    }
    this.currentAnswers.set(token, submission);
  }

  // ---- views ----

  publicState(): PublicGameState {
    return {
      session: this.sessionId,
      phase: this.phase,
      question: this.current?.public ?? null,
      questionNumber: this.questionNumber,
      locked: this.phase === "revealed",
      activeModuleId: this.activeModuleId,
      studentCount: this.students.size,
      answeredCount: this.currentAnswers.size,
      timerSeconds: this.timerSeconds,
      questionEndsAt: this.getQuestionDeadline(),
      serverNow: Date.now(),
    };
  }

  voteTally(): VoteTally | null {
    if (!this.current) return null;
    const counts: Record<string, number> = {};
    for (const submission of this.currentAnswers.values()) {
      const key = submissionToString(submission);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return { questionId: this.current.public.id, counts, total: this.currentAnswers.size };
  }

  analytics(): AnalyticsSnapshot {
    const totalAnswers = this.events.length;
    const totalCorrect = this.events.reduce((sum, e) => sum + e.isCorrect, 0);

    const students: StudentStat[] = [...this.students.values()].map((s) => {
      const mine = this.events.filter((e) => e.studentToken === s.token);
      const correct = mine.reduce((sum, e) => sum + e.isCorrect, 0);
      return {
        token: s.token,
        name: s.name,
        answered: mine.length,
        correct,
        accuracy: mine.length ? correct / mine.length : 0,
      };
    });

    return {
      session: this.sessionId,
      totalAnswers,
      overallAccuracy: totalAnswers ? totalCorrect / totalAnswers : 0,
      students: students.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
      byModule: this.groupBy((e) => e.moduleId).map((g) => ({ ...g, label: getModule(g.key)?.shortTitle ?? g.label })),
      bySkill: this.groupBy((e) => e.skill),
    };
  }

  private groupBy(keyOf: (e: AnswerEventRow) => string): GroupStat[] {
    const buckets = new Map<string, { answered: number; correct: number }>();
    for (const e of this.events) {
      const k = keyOf(e);
      const b = buckets.get(k) ?? { answered: 0, correct: 0 };
      b.answered += 1;
      b.correct += e.isCorrect;
      buckets.set(k, b);
    }
    return [...buckets.entries()].map(([key, b]) => ({
      key,
      label: key,
      answered: b.answered,
      correct: b.correct,
      accuracy: b.answered ? b.correct / b.answered : 0,
    }));
  }

  progress(token: string): StudentProgress {
    const student = this.students.get(token);
    if (!student) throw new HttpError(401, "Unknown student token");
    const mine = this.events.filter((e) => e.studentToken === token);
    const correct = mine.reduce((sum, e) => sum + e.isCorrect, 0);

    const group = (keyOf: (e: AnswerEventRow) => string) => {
      const buckets = new Map<string, { answered: number; correct: number }>();
      for (const e of mine) {
        const k = keyOf(e);
        const b = buckets.get(k) ?? { answered: 0, correct: 0 };
        b.answered += 1;
        b.correct += e.isCorrect;
        buckets.set(k, b);
      }
      return [...buckets.entries()].map(([label, b]) => ({
        label,
        answered: b.answered,
        correct: b.correct,
        accuracy: b.answered ? b.correct / b.answered : 0,
      }));
    };

    return {
      token,
      name: student.name,
      answered: mine.length,
      correct,
      accuracy: mine.length ? correct / mine.length : 0,
      byModule: group((e) => e.moduleId).map((g) => ({ ...g, label: getModule(g.label)?.shortTitle ?? g.label })),
      bySkill: group((e) => e.skill),
    };
  }

  manifest(): SessionManifest {
    return {
      session: this.sessionId,
      seed: this.seed,
      appVersion: APP_VERSION,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      modulesUsed: [...this.modulesUsed],
      studentCount: this.students.size,
      questionCount: this.questionNumber,
    };
  }
}

/** A small error carrying an HTTP status so route handlers can translate it. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Optional machine-readable code the client can map to a specific message. */
    readonly reason?: string,
  ) {
    super(message);
  }
}
