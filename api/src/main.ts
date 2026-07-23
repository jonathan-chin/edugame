/**
 * API entry point.
 *
 * Classroom mode (the default) runs two HTTP servers over one in-memory session:
 *   - student server  -> bound to 0.0.0.0 (tunneled by ngrok): student app + student API
 *   - educator server -> bound to 127.0.0.1 (never tunneled): control API + analytics
 *
 * Solo mode (`SOLO=1`, set by `yarn dev --solo`) runs **one** server, bound to 127.0.0.1: the
 * student app plus flow control, for a single learner studying alone. Nothing listens on a
 * public interface, so there is no tunnel to open and nobody else to protect the controls from.
 *
 * The two are separate branches on purpose. Classroom mode never constructs the solo app, so
 * there is no runtime state — no flag, no misconfiguration — in which the internet-facing
 * server has flow control on it.
 *
 * Each server carries its own WebSocket hub for pushing live updates.
 */

import { randomUUID } from "node:crypto";
import http from "node:http";
import { createRegistry } from "@philosoph/module-api";
import { loadConfig } from "./config.js";
import { createEducatorApp } from "./educator-app.js";
import { installedModules } from "./generated/installed-modules.js";
import { GameService, type SessionBundle } from "./game-service.js";
import { Hub } from "./hub.js";
import { SessionWriter } from "./csv-writer.js";
import { GameSession } from "./session.js";
import { createSoloApp } from "./solo-app.js";
import { createStudentApp } from "./student-app.js";

const config = loadConfig();

// The question modules come from whatever module packages are installed, discovered and composed
// by `yarn modules:sync` into `installedModules`. The engine itself knows about no specific
// content; with no module package installed this registry is simply empty.
const registry = createRegistry(installedModules);

// Mint a fresh session + its files. The first game uses the configured id/seed (which may be
// a fixed reproducibility seed from the CLI); each later reset() gets a new id + seed, so
// every game is recorded in its own CSV/manifest.
let firstSession = true;
function newSession(): SessionBundle {
  const sessionId = firstSession ? config.sessionId : `session-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const seed = firstSession ? config.seed : randomUUID();
  firstSession = false;
  return {
    session: new GameSession(sessionId, seed, registry),
    writer: new SessionWriter(config.sessionsDir, sessionId),
  };
}

const service = new GameService(newSession, config.solo ? "solo" : "classroom");

/** Exit cleanly (with a readable message) rather than throwing an unhandled 'error' if a
 *  port can't be bound. The orchestrator picks free ports up front, so this is a fallback
 *  for a port grabbed in the meantime or for running the API directly on a busy port. */
function onServerError(which: string, port: number) {
  return (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[api] ${which} port ${port} is already in use — exiting.`);
    } else {
      console.error(`[api] ${which} server error:`, err);
    }
    process.exit(1);
  };
}

/** Whatever this process ended up listening on, for a clean shutdown. */
let servers: http.Server[];

if (config.solo) {
  // One learner, one loopback-only listener. Note the bind address is a literal here, not a
  // variable — solo mode has no code path that can reach a public interface.
  const soloServer = http.createServer(createSoloApp(service, config.studentDist, registry));
  const soloHub = new Hub(soloServer, () => service.helloStudent(), service.markSeen);
  service.attachHubs(soloHub, null); // no educator channel exists in solo
  soloServer.on("error", onServerError("solo", config.studentPort));
  soloServer.listen(config.studentPort, "127.0.0.1", () => {
    console.log(`[api] solo server http://127.0.0.1:${config.studentPort}  (localhost only, not tunneled)`);
  });
  servers = [soloServer];
} else {
  const studentServer = http.createServer(createStudentApp(service, config.studentDist));
  const educatorServer = http.createServer(createEducatorApp(service, config.educatorDist, registry));

  const studentHub = new Hub(studentServer, () => service.helloStudent(), service.markSeen);
  const educatorHub = new Hub(educatorServer, () => service.helloEducator());
  service.attachHubs(studentHub, educatorHub);

  studentServer.on("error", onServerError("student", config.studentPort));
  educatorServer.on("error", onServerError("educator", config.educatorPort));

  studentServer.listen(config.studentPort, "0.0.0.0", () => {
    console.log(`[api] student server  http://0.0.0.0:${config.studentPort}  (tunnel this)`);
  });
  educatorServer.listen(config.educatorPort, "127.0.0.1", () => {
    console.log(`[api] educator server http://127.0.0.1:${config.educatorPort}  (localhost only)`);
  });
  servers = [studentServer, educatorServer];
}

service.startPresenceSweep();

console.log(`[api] session=${service.session.sessionId} seed=${service.session.seed}`);
console.log(`[api] writing analytics to ${service.csvPath}`);

function shutdown(signal: string) {
  console.log(`\n[api] ${signal} received — finalizing session manifest.`);
  try {
    service.end();
  } finally {
    for (const server of servers) server.close();
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
