/**
 * The localhost-only Express app: the educator's control surface and full analytics.
 * This server is bound to 127.0.0.1 and never tunneled, so these endpoints are
 * physically unreachable from the internet — the human's chosen security model.
 *
 * Flow control (modules/pool/timer/next/skip/reveal) comes from the shared `mountFlowRoutes`,
 * which the solo server mounts too. What makes those routes an educator privilege here is not
 * anything in this file — it is that this app only ever listens on 127.0.0.1.
 */

import type { ModuleRegistry } from "@philosoph/shared";
import cors from "cors";
import express, { type Express } from "express";
import QRCode from "qrcode";
import { mountFlowRoutes } from "./flow-routes.js";
import type { GameService } from "./game-service.js";
import { errorHandler, serveSpa } from "./http-helpers.js";

export function createEducatorApp(service: GameService, educatorDist: string | null = null, registry: ModuleRegistry): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = express.Router();

  api.get("/health", (_req, res) => res.json({ ok: true }));

  api.get("/state", (_req, res) => res.json(service.state()));

  mountFlowRoutes(api, service, registry);

  api.get("/analytics", (_req, res) => res.json(service.session.analytics()));

  api.post("/end", (_req, res) => {
    service.end();
    res.json({ ok: true, manifest: service.session.manifest() });
  });

  // Educator "log out": finalize the current game, log out all students, and start fresh.
  api.post("/reset", (_req, res) => {
    service.reset();
    res.json(service.state());
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
  serveSpa(app, educatorDist, "classroom");

  app.use(errorHandler);
  return app;
}
