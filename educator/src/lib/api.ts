/**
 * Educator API client. Same-origin with the localhost-only educator server, so the base
 * URL is empty. These endpoints are never exposed to the internet.
 */

import type { AnalyticsSnapshot, ModuleInfo, PublicGameState, SessionManifest } from "@philosoph/shared";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json() as Promise<T>;
}

export const getState = () => req<PublicGameState>("/state");
export const getModules = () => req<ModuleInfo[]>("/modules");
export const getPool = () => req<{ moduleIds: string[] }>("/pool");
export const setPool = (moduleIds: string[]) =>
  req<{ moduleIds: string[] }>("/pool", { method: "POST", body: JSON.stringify({ moduleIds }) });
export const getAnalytics = () => req<AnalyticsSnapshot>("/analytics");
export const getTimer = () => req<{ seconds: number }>("/timer");
export const setTimer = (seconds: number) =>
  req<{ seconds: number }>("/timer", { method: "POST", body: JSON.stringify({ seconds }) });
export const nextQuestion = (moduleId?: string) =>
  req<PublicGameState>("/next", { method: "POST", body: JSON.stringify({ moduleId }) });
export const skipQuestion = () => req<PublicGameState>("/skip", { method: "POST", body: "{}" });
export const revealAnswer = () => req<PublicGameState>("/reveal", { method: "POST", body: "{}" });
export const endSession = () => req<{ ok: true; manifest: SessionManifest }>("/end", { method: "POST", body: "{}" });
/** Educator "log out": end + persist the current game, log out all students, start fresh. */
export const resetGame = () => req<PublicGameState>("/reset", { method: "POST", body: "{}" });
export const getLink = () => req<{ publicUrl: string | null; qrDataUrl: string | null }>("/link");
