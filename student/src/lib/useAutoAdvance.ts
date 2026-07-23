/**
 * The after-reveal auto-advance countdown for solo study: once an answer is showing, wait a few
 * seconds and then draw the next question, hands-free — with a pause for when the learner wants
 * to sit with the answer.
 *
 * Deliberately client-side. The *answer* timer is server-enforced because in a classroom a
 * client clock must not be able to extend everyone's time; this one has no such stakes (one
 * learner, and pausing your own study is the whole point), so keeping it in the browser is both
 * correct and what makes "pause" a one-line state toggle.
 *
 * Returns the whole seconds remaining, or null when inactive (no reveal, or auto-advance off).
 */

import { useEffect, useRef, useState } from "react";

export function useAutoAdvance({
  active,
  seconds,
  paused,
  resetKey,
  onAdvance,
}: {
  /** A reveal is showing — the only time this counts. */
  active: boolean;
  /** Configured wait; 0 disables auto-advance entirely. */
  seconds: number;
  /** Freeze the countdown where it stands. */
  paused: boolean;
  /** Changes when a new question opens, restarting the countdown (use the question id). */
  resetKey: string | null;
  /** Fired exactly once when the countdown reaches zero. */
  onAdvance: () => void;
}): number | null {
  const enabled = active && seconds > 0;
  const [remaining, setRemaining] = useState<number | null>(null);
  const firedRef = useRef(false);
  // Hold the latest callback without making it an effect dependency (it changes every render).
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  // (Re)start whenever a new reveal begins or the configuration changes.
  useEffect(() => {
    firedRef.current = false;
    setRemaining(enabled ? seconds : null);
  }, [enabled, seconds, resetKey]);

  useEffect(() => {
    if (!enabled || paused || remaining == null) return;
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        onAdvanceRef.current();
      }
      return;
    }
    const id = setTimeout(() => setRemaining((r) => (r == null ? r : r - 1)), 1000);
    return () => clearTimeout(id);
  }, [enabled, paused, remaining]);

  return enabled ? remaining : null;
}
