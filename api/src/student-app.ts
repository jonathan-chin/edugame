/**
 * The public (tunneled) Express app: serves the built student bundle and the student
 * API. Everything here is reachable from the internet via ngrok, so it exposes only
 * what a student needs — no flow control, no roster, no full analytics.
 *
 * Note what is *absent*: this file mounts `mountStudentRoutes` and nothing else. There is no
 * conditional, no mode flag, no branch that could ever add flow control to the one app that
 * faces the internet. Solo mode is a different app (`createSoloApp`), not a setting here.
 * `routes.test.ts` asserts exactly that.
 */

import cors from "cors";
import express, { type Express } from "express";
import type { GameService } from "./game-service.js";
import { errorHandler, serveSpa } from "./http-helpers.js";
import { mountStudentRoutes } from "./student-routes.js";

export function createStudentApp(service: GameService, studentDist: string | null): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = express.Router();
  mountStudentRoutes(api, service);
  app.use("/api", api);

  serveSpa(app, studentDist, "classroom");

  app.use(errorHandler);
  return app;
}
