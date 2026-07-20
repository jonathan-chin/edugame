/**
 * Who this device is playing as, for the length of one class.
 *
 * Deliberately **not** sessionStorage. A phone that auto-locks may have its backgrounded tab
 * discarded by the OS, and sessionStorage dies with the tab — the student would unlock partway
 * through a game and find themselves back at the join screen, having lost their name and their
 * history. localStorage survives that.
 *
 * The cost of the longer-lived store is a token that outlives its game, so the identity is
 * stamped with the game session id: the first state that names a different session clears it
 * and the student joins fresh. A stale token is harmless anyway — the server keeps its roster
 * in memory per session, so it answers 401 and the client returns to join.
 */

const KEY = "edugame_identity_v1";

export interface Identity {
  token: string;
  name: string;
  /** The game session this token belongs to; null until the first state arrives. */
  session: string | null;
}

export function readIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const id = JSON.parse(raw) as Identity;
    return id.token && id.name ? id : null;
  } catch {
    return null; // Unparseable or storage blocked — behave as a first-time visitor.
  }
}

export function writeIdentity(id: Identity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(id));
  } catch {
    /* Private mode or a full quota: the student stays joined for this tab's lifetime only. */
  }
}

export function clearIdentity(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
