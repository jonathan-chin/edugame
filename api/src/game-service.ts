/**
 * Ties the session model, the file writer, and the two WebSocket hubs together, and is
 * the single place that decides *what gets broadcast to whom*:
 *   - state/reveal  -> both students and educator (shared game flow)
 *   - votes/analytics -> educator only (kept off the public channel)
 */

import type { PublicGameState, ServerMessage } from "@edugame/shared";
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
  /**
   * A student whose last heartbeat is older than this counts as **disconnected** — their
   * screen is off, the tab is backgrounded, or the network dropped. Kept a few multiples of
   * the client's ~2s heartbeat so a single delayed beat never flickers the count.
   *
   * This is deliberately *only* about the live count. It must never unenrol anyone: a phone
   * that auto-locks stops heartbeating within seconds, and dropping the student there would
   * invalidate their token and discard the answer they already submitted for the open
   * question. Enrolment ends on an explicit logout (`leave`) or an educator `reset`.
   */
  private readonly PRESENCE_TIMEOUT_MS = 5000;
  private readonly PRESENCE_SWEEP_MS = 2000;
  /** Last connected count broadcast, so the sweep only pushes state when it actually moves. */
  private lastConnectedCount = 0;

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

  /**
   * The public state as clients should see it: the session's own view, with `studentCount`
   * narrowed to the students currently connected. The session tracks who is *enrolled*;
   * only this service knows who is *connected* (see presence below).
   */
  state(): PublicGameState {
    return { ...this.session.publicState(), studentCount: this.connectedCount() };
  }

  attachHubs(studentHub: Hub, educatorHub: Hub): void {
    this.studentHub = studentHub;
    this.educatorHub = educatorHub;
  }

  // ---- messages a newly-connected client should receive immediately ----

  helloStudent(): ServerMessage[] {
    const msgs: ServerMessage[] = [{ type: "state", state: this.state() }];
    const reveal = this.session.currentReveal();
    if (reveal) msgs.push({ type: "reveal", reveal });
    return msgs;
  }

  helloEducator(): ServerMessage[] {
    const msgs: ServerMessage[] = [
      { type: "state", state: this.state() },
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

  /** How many enrolled students are currently connected (heartbeat within the timeout). */
  private connectedCount(): number {
    const cutoff = Date.now() - this.PRESENCE_TIMEOUT_MS;
    return this.session.studentTokens().filter((token) => (this.lastSeen.get(token) ?? 0) >= cutoff).length;
  }

  /** Begin watching for students whose heartbeat has gone quiet (screen off, tab backgrounded,
   *  network lost), so the educator's live count keeps up. Called once at startup. */
  startPresenceSweep(): void {
    setInterval(() => this.sweepAbsentStudents(), this.PRESENCE_SWEEP_MS);
  }

  /**
   * Push a fresh state whenever the connected count moves. Note what this does *not* do:
   * it never removes anyone. Going quiet is routine — a locked phone stops heartbeating in
   * seconds — and unenrolling there would invalidate a token mid-game and throw away an
   * answer already submitted for the open question. Coming back just resumes heartbeats.
   */
  private sweepAbsentStudents(): void {
    const connected = this.connectedCount();
    if (connected === this.lastConnectedCount) return;
    this.lastConnectedCount = connected;
    this.broadcastState();
  }

  /** Educator "log out": finalize and persist the current game, send every student back to
   *  the join screen, then start a fresh session (a new id, so a new CSV + manifest). */
  reset() {
    this.end(); // clears the timer, marks endedAt, and writes the outgoing manifest
    this.studentHub?.broadcast({ type: "reset" });
    this.lastSeen.clear();
    this.lastConnectedCount = 0;
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
    const questionId = this.state().question?.id ?? null;
    const delay = Math.max(0, endsAt - Date.now());
    this.revealTimer = setTimeout(() => {
      this.revealTimer = null;
      // Only fire if we're still on the same open question (a manual reveal/skip/next in
      // the interim cancels this, but guard against any race).
      const state = this.state();
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
    const state = this.state();
    // Every push carries the count, so record it here — that keeps the presence sweep from
    // re-broadcasting a change some other action (join, leave) has already announced.
    this.lastConnectedCount = state.studentCount;
    const msg: ServerMessage = { type: "state", state };
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
