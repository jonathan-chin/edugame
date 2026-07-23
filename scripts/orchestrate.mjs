/**
 * One-command launcher.
 *
 *   yarn start [seed] [--no-tunnel] [--skip-build]   # classroom: educator + students
 *   yarn start --solo [seed]                          # one learner studying alone (port 4500)
 *
 * Classroom orchestration (this is the tricky part the project is built around):
 *   1. Build shared + both client bundles (so the API can serve them same-origin).
 *   2. Start the API: student server on the tunneled port, educator server on localhost.
 *   3. Open an ngrok tunnel to the STUDENT port only (educator stays local & private).
 *   4. Push the public URL to the educator API so its Projector tab can show the QR.
 *   5. Open the educator app on localhost.
 *
 * The student bundle is served by the API itself, so the ngrok URL is never baked into
 * a build — students load the app from the same origin its API lives on.
 *
 * Solo skips almost all of that: no educator bundle to build, no second port, and **no tunnel
 * attempt at all** — not "a tunnel that fails", but a branch that never reaches ngrok. One
 * loopback URL is the whole interface. There is no `--tunnel` flag to guard against, because
 * tunnelling in solo mode is not a thing the launcher can be asked to do.
 */

import { spawn } from "node:child_process";
import { get, request } from "node:http";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const seed = args.find((a) => !a.startsWith("--"));
const noTunnel = args.includes("--no-tunnel");
const solo = args.includes("--solo");
const skipBuild = args.includes("--skip-build") || process.env.SKIP_BUILD === "1";

const flagValue = (flag, fallback) => {
  const hit = args.find((a) => a.startsWith(`${flag}=`));
  return hit ? Number(hit.slice(flag.length + 1)) : fallback;
};
const STUDENT_PORT = flagValue("--student-port", Number(process.env.STUDENT_PORT ?? 4000));
// Solo listens somewhere else by default. Sharing :4000 with the classroom meant a browser
// asked to open it could focus a *stale classroom tab* still sitting on that URL instead of
// loading the solo app — and the two also have separate stored identities, so crossing them
// over is confusing even when it works. `--student-port` still overrides.
const SOLO_PORT = flagValue("--student-port", Number(process.env.SOLO_PORT ?? 4500));
const EDUCATOR_PORT = flagValue("--educator-port", Number(process.env.EDUCATOR_PORT ?? 4100));

const children = [];
function run(cmd, cmdArgs, opts = {}) {
  const child = spawn(cmd, cmdArgs, { stdio: "inherit", shell: process.platform === "win32", ...opts });
  children.push(child);
  return child;
}
function runToCompletion(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = run(cmd, cmdArgs, opts);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${cmdArgs.join(" ")} exited with ${code}`))));
  });
}

function waitForHealth(port, timeoutMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = get({ host: "127.0.0.1", port, path: "/api/health" }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on("error", retry);
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error(`API on :${port} did not become healthy`));
      setTimeout(tick, 300);
    };
    tick();
  });
}

/** True if `port` can be bound on `host` right now (probed by briefly listening). */
function isPortFree(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });
}

/** The first free port at or after `preferred` on `host`, skipping anything in `exclude`. */
async function findOpenPort(preferred, host, exclude = []) {
  for (let port = preferred; port < preferred + 100; port++) {
    if (!exclude.includes(port) && (await isPortFree(port, host))) return port;
  }
  throw new Error(`No open port found in ${preferred}–${preferred + 99} on ${host}`);
}

function postLink(url, port) {
  const body = JSON.stringify({ url });
  return new Promise((resolve) => {
    const r = request(
      {
        host: "127.0.0.1",
        port,
        path: "/api/link",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        res.resume();
        res.on("end", resolve);
      },
    );
    r.on("error", resolve);
    r.write(body);
    r.end();
  });
}

async function main() {
  // Discover installed question-module packages and regenerate the composed registry before
  // anything runs — so `yarn dev` picks up a newly-added module package without a manual step.
  // Runs even with --skip-build, since the generated file feeds the API server, not the bundles.
  await runToCompletion("node", ["scripts/sync-modules.mjs"], { cwd: ROOT });

  if (!skipBuild) {
    // Solo never serves the educator app, so don't spend the time building it.
    console.log(`[orchestrate] building shared + ${solo ? "student bundle" : "client bundles"}…`);
    await runToCompletion("yarn", [solo ? "build:solo" : "build"], { cwd: ROOT });
  } else {
    console.log("[orchestrate] --skip-build: using existing bundles");
  }

  if (solo) return startSolo();

  // The requested ports may already be taken (a leftover process, a second instance). Probe
  // from each requested port and use the next free one so the API never crashes on
  // EADDRINUSE. The student server binds 0.0.0.0 and the educator server 127.0.0.1, so probe
  // each on the host it will actually bind, and keep the two ports distinct.
  const studentPort = await findOpenPort(STUDENT_PORT, "0.0.0.0");
  const educatorPort = await findOpenPort(EDUCATOR_PORT, "127.0.0.1", [studentPort]);
  if (studentPort !== STUDENT_PORT) console.log(`[orchestrate] student port ${STUDENT_PORT} in use → using ${studentPort}`);
  if (educatorPort !== EDUCATOR_PORT) console.log(`[orchestrate] educator port ${EDUCATOR_PORT} in use → using ${educatorPort}`);

  console.log("[orchestrate] starting API…");
  const api = run("yarn", ["workspace", "@philosoph/api", "start"], {
    cwd: ROOT,
    env: {
      ...process.env,
      STUDENT_PORT: String(studentPort),
      EDUCATOR_PORT: String(educatorPort),
      ...(seed ? { SEED: seed } : {}),
      SESSIONS_DIR: path.join(ROOT, "sessions"),
      STUDENT_DIST: path.join(ROOT, "student", "dist"),
      EDUCATOR_DIST: path.join(ROOT, "educator", "dist"),
    },
  });

  // If the API dies during startup (e.g. a port was grabbed in the gap after probing), fail
  // fast with a clear message instead of waiting out the full health-check timeout.
  let apiReady = false;
  api.on("exit", (code) => {
    if (!apiReady) {
      console.error(`[orchestrate] API exited during startup (code ${code}). See the log above.`);
      shutdown();
    }
  });

  await waitForHealth(studentPort);
  await waitForHealth(educatorPort);
  apiReady = true;
  console.log("[orchestrate] API healthy.");

  let publicUrl = null;
  if (!noTunnel) {
    try {
      const ngrok = await import("@ngrok/ngrok");
      const listener = await ngrok.forward({ addr: studentPort, authtoken_from_env: true });
      publicUrl = listener.url();
      await postLink(publicUrl, educatorPort);
      console.log(`[orchestrate] ngrok tunnel: ${publicUrl}`);
    } catch (err) {
      console.warn(`[orchestrate] ngrok unavailable (${err instanceof Error ? err.message : err}).`);
      console.warn("[orchestrate] Set NGROK_AUTHTOKEN, or pass --no-tunnel to run on your LAN only.");
    }
  }

  const educatorUrl = `http://localhost:${educatorPort}`;
  console.log("\n──────────────────────────────────────────────");
  console.log(`  Educator (this laptop):  ${educatorUrl}`);
  console.log(`  Student join link:       ${publicUrl ?? `http://<your-LAN-ip>:${studentPort}`}`);
  console.log("──────────────────────────────────────────────\n");

  if (process.platform === "darwin") run("open", [educatorUrl]);
}

/**
 * Solo: one server, one port, bound to loopback. Nothing here mentions ngrok, an educator, or
 * a join link — none of them exist in this mode, and printing them would just be noise for
 * someone sitting alone with their own laptop.
 */
async function startSolo() {
  const port = await findOpenPort(SOLO_PORT, "127.0.0.1");
  if (port !== SOLO_PORT) console.log(`[orchestrate] port ${SOLO_PORT} in use → using ${port}`);

  console.log("[orchestrate] starting solo study session…");
  const api = run("yarn", ["workspace", "@philosoph/api", "start"], {
    cwd: ROOT,
    env: {
      ...process.env,
      SOLO: "1",
      STUDENT_PORT: String(port),
      ...(seed ? { SEED: seed } : {}),
      SESSIONS_DIR: path.join(ROOT, "sessions"),
      STUDENT_DIST: path.join(ROOT, "student", "dist"),
    },
  });

  let apiReady = false;
  api.on("exit", (code) => {
    if (!apiReady) {
      console.error(`[orchestrate] API exited during startup (code ${code}). See the log above.`);
      shutdown();
    }
  });

  await waitForHealth(port);
  apiReady = true;

  const url = `http://localhost:${port}`;
  console.log("\n──────────────────────────────────────────────");
  console.log(`  Study:  ${url}`);
  console.log("──────────────────────────────────────────────\n");

  if (process.platform === "darwin") run("open", [url]);
}

function shutdown() {
  for (const c of children) {
    try {
      c.kill("SIGINT");
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(0), 400);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("[orchestrate]", err);
  shutdown();
});
