/**
 * A live per-question countdown derived from the server-provided deadline.
 *
 * The server is authoritative on the timer (it auto-reveals when it expires); this hook is
 * purely cosmetic. `endsAt` and `serverNow` come straight off the game state. We measure the
 * offset between the server clock and this device's clock once per state update, so the
 * countdown stays correct even if the two clocks disagree.
 *
 * Returns the remaining whole seconds (>= 0), or null when the question is untimed.
 */

import { useEffect, useRef, useState } from "react";

export function useCountdown(endsAt: number | null, serverNow: number | undefined): number | null {
  const skewRef = useRef(0);

  // Re-measure clock skew whenever a fresh server timestamp arrives.
  useEffect(() => {
    if (serverNow != null) skewRef.current = serverNow - Date.now();
  }, [serverNow]);

  const remainingOf = (deadline: number | null) =>
    deadline == null ? null : Math.max(0, Math.ceil((deadline - (Date.now() + skewRef.current)) / 1000));

  const [remaining, setRemaining] = useState<number | null>(() => remainingOf(endsAt));

  useEffect(() => {
    setRemaining(remainingOf(endsAt));
    if (endsAt == null) return;
    const id = setInterval(() => setRemaining(remainingOf(endsAt)), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  return remaining;
}
