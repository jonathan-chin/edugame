import fs from "node:fs";
import path from "node:path";
import type { GameMode } from "@philosoph/shared";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { HttpError } from "./session.js";

/**
 * Serve a built SPA bundle, with a catch-all fallback to index.html for client-side routing.
 * Serving the app from the API is what makes the two same-origin, so no API URL (least of all
 * an ngrok one) ever has to be baked into a build.
 *
 * `mode` is stamped into the served HTML as a meta tag. The student bundle contains two shells
 * (classroom and solo) and has to pick one before it renders anything; asking over HTTP made
 * that a race, and a race whose failure mode was rendering the *wrong app*. Delivering it in
 * the document removes the question — the shell is known at parse time, from the same server
 * that decides which routes exist, so the two can never disagree.
 *
 * index.html is served `no-store` (the hashed assets beside it stay cacheable). It carries the
 * mode now, so a stale copy would be a stale answer.
 */
export function serveSpa(app: Express, dist: string | null, mode: GameMode): void {
  if (!dist || !fs.existsSync(dist)) return;
  app.use(express.static(dist, { index: false }));

  const indexPath = path.join(dist, "index.html");
  const render = () =>
    fs
      .readFileSync(indexPath, "utf8")
      .replace("<head>", `<head><meta name="edugame-mode" content="${mode}">`);

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.set("Cache-Control", "no-store").type("html").send(render());
  });
}

/** Express error middleware: translate HttpError into its status, everything else 500. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, reason: err.reason });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal server error" });
}
