/**
 * A solo learner's study settings — the two timers configured on the module screen.
 *
 * Persisted to localStorage so they carry across reloads and study sessions: a learner who
 * likes "30s to answer, auto-advance after 5s" should not re-pick it every time. Kept separate
 * from `identity` because it is a preference, not who you are.
 *
 * These are solo-only. The classroom's answer timer is the educator's to set; nothing here
 * touches that path.
 */

const KEY = "edugame_solo_settings_v1";

export interface SoloSettings {
  /**
   * Seconds a question stays open before the **server** locks and reveals it; 0 = no limit.
   * This is the existing per-question timer, set via `setAnswerTimer`.
   */
  answerSeconds: number;
  /**
   * Seconds to wait after a reveal before the next question is drawn; 0 = advance only on tap.
   * Enforced client-side (see `useAutoAdvance`) and pausable mid-countdown.
   */
  advanceSeconds: number;
}

export const DEFAULT_SOLO_SETTINGS: SoloSettings = { answerSeconds: 0, advanceSeconds: 0 };

/** Preset choices offered on the module screen. 0 always means "off". */
export const ANSWER_SECONDS_PRESETS = [0, 15, 30, 60] as const;
export const ADVANCE_SECONDS_PRESETS = [0, 3, 5, 10] as const;

export function readSoloSettings(): SoloSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SOLO_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoloSettings>;
    // Coerce defensively: a hand-edited or stale value must not wedge the setup screen.
    return {
      answerSeconds: Number.isFinite(parsed.answerSeconds) ? Math.max(0, Number(parsed.answerSeconds)) : 0,
      advanceSeconds: Number.isFinite(parsed.advanceSeconds) ? Math.max(0, Number(parsed.advanceSeconds)) : 0,
    };
  } catch {
    return DEFAULT_SOLO_SETTINGS;
  }
}

export function writeSoloSettings(s: SoloSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* Private mode or full quota: settings just won't persist past this tab. */
  }
}
