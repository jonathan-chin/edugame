/**
 * Thin API client. The base URL is empty because the student bundle is served by the
 * API itself (same origin) — so no ngrok URL is ever baked in. The
 * `ngrok-skip-browser-warning` header is always sent to sidestep the free-tier
 * interstitial on API responses (a concern we flagged up front).
 */

import type { PublicGameState, StudentProgress, Submission } from "@edugame/shared";

const HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

/**
 * Fired when the server rejects our student token (401). The only 401s in this API mean
 * "unknown student token" — which happens when the token in localStorage is left over from
 * a previous, now-gone server session. The app listens for this and sends the student back
 * to the join screen to get a fresh token.
 */
export const SESSION_INVALID_EVENT = "student-session-invalid";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { ...init, headers: { ...HEADERS, ...init?.headers } });
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event(SESSION_INVALID_EVENT));
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText, body.reason);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
  }
}

export function getState(): Promise<PublicGameState> {
  return req("/state");
}

export function joinGame(name: string): Promise<{ token: string; name: string }> {
  return req("/join", { method: "POST", body: JSON.stringify({ name }) });
}

export function submitAnswer(token: string, submission: Submission): Promise<{ ok: true }> {
  return req("/answer", { method: "POST", body: JSON.stringify({ token, submission }) });
}

export function getProgress(token: string): Promise<StudentProgress> {
  return req(`/progress?token=${encodeURIComponent(token)}`);
}

/** Log out: release this student's token and name on the server. */
export function leaveGame(token: string): Promise<{ ok: true }> {
  return req("/leave", { method: "POST", body: JSON.stringify({ token }) });
}

export function getJoinQr(): Promise<{ url: string; qrDataUrl: string }> {
  return req("/join-qr");
}
