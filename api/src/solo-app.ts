/**
 * The solo study app: one learner, one port, bound to 127.0.0.1 and never tunneled.
 *
 * This is where the student routes and the flow routes meet — legitimately, because the person
 * answering the question is also the person entitled to say "show me the answer" and "next
 * card". There is nobody else to grief.
 *
 * That combination is safe *only* because of where this app runs. It is composed here and
 * mounted on a loopback-only listener (see main.ts); the tunneled `createStudentApp` is a
 * separate factory that never gains these routes. Keeping them as two apps rather than one app
 * with a flag is the whole design: there is no runtime state in which the public server has
 * flow control.
 *
 * Deliberately *not* mounted, even though this app is private:
 *   - `/analytics` — it reports every student's name and score. Solo has one learner, who reads
 *     their own results through `/progress` like any other player.
 *   - `/link`, `/reset` — tunnel plumbing and educator "log everyone out"; neither has meaning
 *     for one person. Ending the session is handled on process shutdown.
 */

import type { ModuleRegistry } from "@edugame/shared";
import cors from "cors";
import express, { type Express } from "express";
import { mountFlowRoutes } from "./flow-routes.js";
import type { GameService } from "./game-service.js";
import { errorHandler, serveSpa } from "./http-helpers.js";
import { mountStudentRoutes } from "./student-routes.js";

export function createSoloApp(service: GameService, studentDist: string | null, registry: ModuleRegistry): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = express.Router();
  mountStudentRoutes(api, service);
  mountFlowRoutes(api, service, registry);
  app.use("/api", api);

  // The solo learner uses the student bundle — same app, different shell, chosen from the
  // `mode` this server reports in its state.
  serveSpa(app, studentDist, "solo");

  app.use(errorHandler);
  return app;
}
