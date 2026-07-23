import { randomUUID } from "node:crypto";
import path from "node:path";

export interface Config {
  /** Public, tunneled port that serves the student app + student API + student WS. */
  studentPort: number;
  /** Localhost-only port for the educator control API + educator WS. Never tunneled. */
  educatorPort: number;
  /** Reproducibility seed for question generation. */
  seed: string;
  /** Unique id for this game session (used in filenames and analytics rows). */
  sessionId: string;
  /** Directory where `<session>.csv` and `<session>.meta.json` are written. */
  sessionsDir: string;
  /** Absolute path to the built student bundle, or null to skip static serving. */
  studentDist: string | null;
  /** Absolute path to the built educator bundle, or null to skip static serving. */
  educatorDist: string | null;
  /**
   * Solo study mode: one learner on one loopback-only port, no educator server, no tunnel.
   * Set by the orchestrator's `--solo`.
   */
  solo: boolean;
}

export function loadConfig(): Config {
  const seed = process.env.SEED?.trim() || randomUUID();
  return {
    studentPort: Number(process.env.STUDENT_PORT ?? 4000),
    educatorPort: Number(process.env.EDUCATOR_PORT ?? 4100),
    seed,
    sessionId: process.env.SESSION_ID?.trim() || `session-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    sessionsDir: process.env.SESSIONS_DIR?.trim() || path.resolve(process.cwd(), "sessions"),
    studentDist: process.env.STUDENT_DIST?.trim() || null,
    educatorDist: process.env.EDUCATOR_DIST?.trim() || null,
    solo: process.env.SOLO === "1",
  };
}
