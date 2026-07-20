/**
 * The public (tunneled) Express app: serves the built student bundle and the student
 * API. Everything here is reachable from the internet via ngrok, so it exposes only
 * what a student needs — no flow control, no roster, no full analytics.
 */

import fs from "node:fs";
import path from "node:path";
import { checkName, type Submission } from "@edugame/shared";
import cors from "cors";
import express, { type Express } from "express";
import type { GameService } from "./game-service.js";
import { errorHandler } from "./http-helpers.js";
import { HttpError } from "./session.js";

export function createStudentApp(service: GameService, studentDist: string | null): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = express.Router();

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

  app.use("/api", api);

  // Serve the built student SPA, with a catch-all fallback to index.html for client
  // routing. This is what makes the app same-origin with its API, so no ngrok URL ever
  // needs to be baked into the bundle.
  if (studentDist && fs.existsSync(studentDist)) {
    app.use(express.static(studentDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(studentDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
