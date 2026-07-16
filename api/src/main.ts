/**
 * API entry point.
 *
 * Two HTTP servers share one in-memory session:
 *   - student server  -> bound to 0.0.0.0 (tunneled by ngrok): student app + student API
 *   - educator server -> bound to 127.0.0.1 (never tunneled): control API + analytics
 *
 * Each server carries its own WebSocket hub for pushing live updates.
 */

import { randomUUID } from "node:crypto";
import http from "node:http";
import { loadConfig } from "./config.js";
import { createEducatorApp } from "./educator-app.js";
import { GameService, type SessionBundle } from "./game-service.js";
import { Hub } from "./hub.js";
import { SessionWriter } from "./csv-writer.js";
import { GameSession } from "./session.js";
import { createStudentApp } from "./student-app.js";

const config = loadConfig();

// Mint a fresh session + its files. The first game uses the configured id/seed (which may be
// a fixed reproducibility seed from the CLI); each later reset() gets a new id + seed, so
// every game is recorded in its own CSV/manifest.
let firstSession = true;
function newSession(): SessionBundle {
  const sessionId = firstSession ? config.sessionId : `session-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const seed = firstSession ? config.seed : randomUUID();
  firstSession = false;
  return {
    session: new GameSession(sessionId, seed),
    writer: new SessionWriter(config.sessionsDir, sessionId),
  };
}

const service = new GameService(newSession);

const studentServer = http.createServer(createStudentApp(service, config.studentDist));
const educatorServer = http.createServer(createEducatorApp(service, config.educatorDist));

const studentHub = new Hub(studentServer, () => service.helloStudent(), service.markSeen);
const educatorHub = new Hub(educatorServer, () => service.helloEducator());
service.attachHubs(studentHub, educatorHub);
service.startPresenceSweep();

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
studentServer.on("error", onServerError("student", config.studentPort));
educatorServer.on("error", onServerError("educator", config.educatorPort));

studentServer.listen(config.studentPort, "0.0.0.0", () => {
  console.log(`[api] student server  http://0.0.0.0:${config.studentPort}  (tunnel this)`);
});
educatorServer.listen(config.educatorPort, "127.0.0.1", () => {
  console.log(`[api] educator server http://127.0.0.1:${config.educatorPort}  (localhost only)`);
});

console.log(`[api] session=${service.session.sessionId} seed=${service.session.seed}`);
console.log(`[api] writing analytics to ${service.csvPath}`);

function shutdown(signal: string) {
  console.log(`\n[api] ${signal} received — finalizing session manifest.`);
  try {
    service.end();
  } finally {
    studentServer.close();
    educatorServer.close();
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
