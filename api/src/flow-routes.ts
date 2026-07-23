/**
 * Flow control: what to study, how long each question stays open, and when to move on.
 *
 * **These routes are the reason the classroom is hard to grief.** They are never mounted on
 * the tunneled student server — only on the educator server (bound to 127.0.0.1) and on the
 * solo server (also loopback-only, one learner). A student in a classroom cannot call them
 * because on the server they can reach, they do not exist. That topology *is* the enforcement;
 * there is no role check anywhere, and none is needed.
 *
 * The same handlers serve both because the actions are genuinely the same — "draw a question",
 * "show me the answer". Only who is entitled to press them differs, and that is settled by
 * which server mounts this router.
 */

import type { ModuleRegistry } from "@philosoph/shared";
import type { Router } from "express";
import type { GameService } from "./game-service.js";

export function mountFlowRoutes(api: Router, service: GameService, registry: ModuleRegistry): void {
  api.get("/modules", (_req, res) => res.json(registry.catalog()));

  api.get("/pool", (_req, res) => res.json({ moduleIds: service.session.getModulePool() }));

  api.post("/pool", (req, res) => {
    const ids = Array.isArray(req.body?.moduleIds) ? req.body.moduleIds.map(String) : [];
    service.session.setModulePool(ids);
    res.json({ moduleIds: service.session.getModulePool() });
  });

  api.get("/timer", (_req, res) => res.json({ seconds: service.session.getTimer() }));

  api.post("/timer", (req, res) => {
    const seconds = Number(req.body?.seconds);
    res.json(service.setTimer(Number.isFinite(seconds) ? seconds : 0));
  });

  api.post("/next", (req, res) => {
    const moduleId = req.body?.moduleId ? String(req.body.moduleId) : undefined;
    service.next(moduleId);
    res.json(service.state());
  });

  api.post("/skip", (_req, res) => {
    service.skip();
    res.json(service.state());
  });

  api.post("/reveal", (_req, res) => {
    service.reveal();
    res.json(service.state());
  });
}
