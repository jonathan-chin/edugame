/**
 * The routes a *player* needs: identity, answering, and their own progress.
 *
 * Factored out so the classroom student server and the solo server mount the identical
 * implementation rather than two copies that can drift. Nothing here reveals anything about
 * anyone else — a student can only ever read back their own progress, by token.
 */

import { checkName, type Submission } from "@philosoph/shared";
import type { Router } from "express";
import type { GameService } from "./game-service.js";
import { HttpError } from "./session.js";

export function mountStudentRoutes(api: Router, service: GameService): void {
  api.get("/health", (_req, res) => res.json({ ok: true }));

  api.get("/state", (_req, res) => res.json(service.state()));

  api.post("/join", (req, res) => {
    const check = checkName(String(req.body?.name ?? ""));
    if (!check.ok) {
      res.status(400).json({ error: "invalid-name", reason: check.reason });
      return;
    }
    res.json(service.join(check.value));
  });

  api.post("/answer", (req, res) => {
    const token = String(req.body?.token ?? "");
    const submission = req.body?.submission as Submission | undefined;
    if (!token || !submission) throw new HttpError(400, "Missing token or submission");
    service.submit(token, submission);
    res.json({ ok: true });
  });

  // A student logs out — release their token/name. Unknown tokens are a no-op.
  api.post("/leave", (req, res) => {
    const token = String(req.body?.token ?? "");
    if (token) service.leave(token);
    res.json({ ok: true });
  });

  api.get("/progress", (req, res) => {
    const token = String(req.query.token ?? "");
    if (!token) throw new HttpError(400, "Missing token");
    res.json(service.session.progress(token));
  });
}
