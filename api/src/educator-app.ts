/**
 * The localhost-only Express app: the educator's control surface and full analytics.
 * This server is bound to 127.0.0.1 and never tunneled, so these endpoints are
 * physically unreachable from the internet — the human's chosen security model.
 */

import fs from "node:fs";
import path from "node:path";
import { moduleCatalog } from "@edugame/shared";
import cors from "cors";
import express, { type Express } from "express";
import QRCode from "qrcode";
import type { GameService } from "./game-service.js";
import { errorHandler } from "./http-helpers.js";

export function createEducatorApp(service: GameService, educatorDist: string | null = null): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = express.Router();

  api.get("/health", (_req, res) => res.json({ ok: true }));

  api.get("/state", (_req, res) => res.json(service.session.publicState()));

  api.get("/modules", (_req, res) => res.json(moduleCatalog()));

  api.get("/pool", (_req, res) => res.json({ moduleIds: service.session.getModulePool() }));

  api.post("/pool", (req, res) => {
    const ids = Array.isArray(req.body?.moduleIds) ? req.body.moduleIds.map(String) : [];
    service.session.setModulePool(ids);
    res.json({ moduleIds: service.session.getModulePool() });
  });

  api.get("/analytics", (_req, res) => res.json(service.session.analytics()));

  api.get("/timer", (_req, res) => res.json({ seconds: service.session.getTimer() }));

  api.post("/timer", (req, res) => {
    const seconds = Number(req.body?.seconds);
    res.json(service.setTimer(Number.isFinite(seconds) ? seconds : 0));
  });

  api.post("/next", (req, res) => {
    const moduleId = req.body?.moduleId ? String(req.body.moduleId) : undefined;
    service.next(moduleId);
    res.json(service.session.publicState());
  });

  api.post("/skip", (_req, res) => {
    service.skip();
    res.json(service.session.publicState());
  });

  api.post("/reveal", (_req, res) => {
    service.reveal();
    res.json(service.session.publicState());
  });

  api.post("/end", (_req, res) => {
    service.end();
    res.json({ ok: true, manifest: service.session.manifest() });
  });

  // Educator "log out": finalize the current game, log out all students, and start fresh.
  api.post("/reset", (_req, res) => {
    service.reset();
    res.json(service.session.publicState());
  });

  // The ngrok URL is pushed here by the orchestrator once the tunnel is up; the
  // educator client reads it to render the projector join QR.
  api.get("/link", async (_req, res) => {
    const url = service.publicUrl;
    const qrDataUrl = url ? await QRCode.toDataURL(url, { margin: 1, width: 320 }) : null;
    res.json({ publicUrl: url, qrDataUrl });
  });

  api.post("/link", (req, res) => {
    service.publicUrl = req.body?.url ? String(req.body.url) : null;
    res.json({ ok: true, publicUrl: service.publicUrl });
  });

  app.use("/api", api);

  // Serve the built educator SPA same-origin on the localhost port.
  if (educatorDist && fs.existsSync(educatorDist)) {
    app.use(express.static(educatorDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(educatorDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
