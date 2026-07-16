/**
 * Ties the session model, the file writer, and the two WebSocket hubs together, and is
 * the single place that decides *what gets broadcast to whom*:
 *   - state/reveal  -> both students and educator (shared game flow)
 *   - votes/analytics -> educator only (kept off the public channel)
 */

import type { ServerMessage } from "@edugame/shared";
import type { SessionWriter } from "./csv-writer.js";
import type { Hub } from "./hub.js";
import type { GameSession } from "./session.js";

/** Everything a single game needs: the in-memory session and the files it writes to. */
export type SessionBundle = { session: GameSession; writer: SessionWriter };

export class GameService {
  private studentHub: Hub | null = null;
  private educatorHub: Hub | null = null;
  /** Pending server-side auto-reveal for the current timed question, if any. */
  private revealTimer: ReturnType<typeof setTimeout> | null = null;
  /** The ngrok URL, set by the orchestrator once the tunnel is up (localhost route). */
  publicUrl: string | null = null;

  // ---- student presence (heartbeat) ----
  /** token -> epoch ms of the last heartbeat from that student's socket. */
  private readonly lastSeen = new Map<string, number>();
  /** A student whose last heartbeat is older than this is treated as gone. Kept a few
   *  multiples of the client's ~2s heartbeat so a single delayed beat never evicts anyone. */
  private readonly PRESENCE_TIMEOUT_MS = 5000;
  private readonly PRESENCE_SWEEP_MS = 2000;

  /** The live game. Replaced wholesale by reset(), so it is mutable (not readonly). */
  session: GameSession;
  private writer: SessionWriter;

  /** `newSession` mints a fresh session + writer (new id → new files); called at startup
   *  and again on every reset(). */
  constructor(private readonly newSession: () => SessionBundle) {
    const bundle = this.newSession();
    this.session = bundle.session;
    this.writer = bundle.writer;
    this.writer.writeManifest(this.session.manifest());
  }

  /** Absolute path of the current session's CSV (used for startup logging). */
  get csvPath(): string {
    return this.writer.paths.csv;
  }

  attachHubs(studentHub: Hub, educatorHub: Hub): void {
    this.studentHub = studentHub;
    this.educatorHub = educatorHub;
  }

  // ---- messages a newly-connected client should receive immediately ----

  helloStudent(): ServerMessage[] {
    const msgs: ServerMessage[] = [{ type: "state", state: this.session.publicState() }];
    const reveal = this.session.currentReveal();
    if (reveal) msgs.push({ type: "reveal", reveal });
    return msgs;
  }

  helloEducator(): ServerMessage[] {
    const msgs: ServerMessage[] = [
      { type: "state", state: this.session.publicState() },
      { type: "analytics", snapshot: this.session.analytics() },
    ];
    const reveal = this.session.currentReveal();
    if (reveal) msgs.push({ type: "reveal", reveal });
    const tally = this.session.voteTally();
    if (tally) msgs.push({ type: "votes", tally });
    return msgs;
  }

  // ---- actions ----

  join(name: string) {
    const result = this.session.join(name);
    this.lastSeen.set(result.token, Date.now()); // present from the moment they join
    this.writer.writeManifest(this.session.manifest());
    this.broadcastState();
    // Also refresh analytics so the educator's roster ("Students") shows the newcomer right
    // away — otherwise the count in the control panel and the roster list disagree.
    this.broadcastAnalytics();
    return result;
  }

  submit(token: string, submission: Parameters<GameSession["submit"]>[1]) {
    this.session.submit(token, submission);
    this.broadcastState();
    this.broadcastVotes();
  }

  /** Update the per-question auto-reveal timer (educator-only). Applies to the next draw. */
  setTimer(seconds: number) {
    this.session.setTimer(seconds);
    this.broadcastState();
    return { seconds: this.session.getTimer() };
  }

  next(moduleId?: string) {
    this.session.nextQuestion(moduleId);
    this.writer.writeManifest(this.session.manifest());
    this.broadcastState();
    this.broadcastVotes();
    this.armTimer();
  }

  skip(moduleId?: string) {
    this.session.skipQuestion(moduleId);
    this.writer.writeManifest(this.session.manifest());
    this.broadcastState();
    this.broadcastVotes();
    this.armTimer();
  }

  reveal() {
    this.clearTimer();
    const { rows, reveal } = this.session.reveal();
    // Record the just-revealed question (with its correct answer) for the session file. The
    // writer externalizes any graphics to sidecar files; the manifest keeps only refs.
    const generated = this.session.currentGenerated();
    if (generated) this.session.addRecordedQuestion(this.writer.recordQuestion(generated.public, generated.key));
    this.writer.appendRows(rows);
    this.writer.writeManifest(this.session.manifest());
    this.studentHub?.broadcast({ type: "reveal", reveal });
    this.educatorHub?.broadcast({ type: "reveal", reveal });
    this.broadcastState();
    this.broadcastAnalytics();
    return { count: rows.length };
  }

  end() {
    this.clearTimer();
    this.session.end();
    this.writer.writeManifest(this.session.manifest());
  }

  /** A student logs out: free their name/token, drop any pending answer, and refresh the
   *  educator's roster + analytics. */
  leave(token: string) {
    this.session.removeStudent(token);
    this.lastSeen.delete(token);
    this.writer.writeManifest(this.session.manifest());
    this.broadcastState();
    this.broadcastVotes();
    this.broadcastAnalytics();
  }

  // ---- student presence ----

  /** Record a heartbeat from a student's socket (wired to the student hub). */
  markSeen = (token: string): void => {
    if (this.session.hasStudent(token)) this.lastSeen.set(token, Date.now());
  };

  /** Begin periodically dropping students who have stopped sending heartbeats (tab closed,
   *  network lost, or logged out). Called once at startup. */
  startPresenceSweep(): void {
    setInterval(() => this.sweepAbsentStudents(), this.PRESENCE_SWEEP_MS);
  }

  private sweepAbsentStudents(): void {
    const cutoff = Date.now() - this.PRESENCE_TIMEOUT_MS;
    const gone = this.session.studentTokens().filter((token) => (this.lastSeen.get(token) ?? 0) < cutoff);
    if (gone.length === 0) return;
    for (const token of gone) {
      this.session.removeStudent(token);
      this.lastSeen.delete(token);
    }
    this.writer.writeManifest(this.session.manifest());
    this.broadcastState();
    this.broadcastVotes();
    this.broadcastAnalytics();
  }

  /** Educator "log out": finalize and persist the current game, send every student back to
   *  the join screen, then start a fresh session (a new id, so a new CSV + manifest). */
  reset() {
    this.end(); // clears the timer, marks endedAt, and writes the outgoing manifest
    this.studentHub?.broadcast({ type: "reset" });
    this.lastSeen.clear();
    const bundle = this.newSession();
    this.session = bundle.session;
    this.writer = bundle.writer;
    this.writer.writeManifest(this.session.manifest());
    this.broadcastState();
    this.broadcastAnalytics();
  }

  // ---- auto-reveal timer ----

  /** Schedule the server-side auto-reveal for the current question, if it has a deadline.
   *  The server is the authority: when the timer fires it reveals exactly as the educator
   *  would, so answers lock and grade the same way regardless of any client's clock. */
  private armTimer() {
    this.clearTimer();
    const endsAt = this.session.getQuestionDeadline();
    if (endsAt === null) return;
    const questionId = this.session.publicState().question?.id ?? null;
    const delay = Math.max(0, endsAt - Date.now());
    this.revealTimer = setTimeout(() => {
      this.revealTimer = null;
      // Only fire if we're still on the same open question (a manual reveal/skip/next in
      // the interim cancels this, but guard against any race).
      const state = this.session.publicState();
      if (state.phase === "question" && state.question?.id === questionId) {
        try {
          this.reveal();
        } catch {
          /* already advanced — nothing to reveal */
        }
      }
    }, delay);
  }

  private clearTimer() {
    if (this.revealTimer) {
      clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }
  }

  // ---- broadcasts ----

  private broadcastState() {
    const msg: ServerMessage = { type: "state", state: this.session.publicState() };
    this.studentHub?.broadcast(msg);
    this.educatorHub?.broadcast(msg);
  }

  private broadcastVotes() {
    const tally = this.session.voteTally();
    if (tally) this.educatorHub?.broadcast({ type: "votes", tally });
  }

  private broadcastAnalytics() {
    this.educatorHub?.broadcast({ type: "analytics", snapshot: this.session.analytics() });
  }
}
