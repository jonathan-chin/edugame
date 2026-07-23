/**
 * The one security property this project actually depends on, pinned down.
 *
 * There is no authentication anywhere in EduGame. A classroom student cannot skip questions,
 * reveal answers, swap the module pool or reset the timer for one reason only: **those routes
 * are not mounted on the server they can reach.** That is a topological guarantee, and topology
 * is easy to break by accident — one `if (solo)` inside `createStudentApp`, one convenience
 * route added to the wrong factory, and the tunneled server grows a griefing surface with no
 * error to notice.
 *
 * So these tests assert route *absence*, which no typechecker can. They run the real apps over
 * real HTTP on an ephemeral loopback port.
 *
 *   yarn workspace @edugame/api test
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import http from "node:http";
import test from "node:test";
import { createRegistry } from "@edugame/module-api";
import { defaultRegistry } from "@edugame/modules";
import { SOLO_STUDENT_TOKEN } from "@edugame/shared";
import type { Express } from "express";
import { SessionWriter } from "./csv-writer.js";
import { createEducatorApp } from "./educator-app.js";
import { GameService } from "./game-service.js";
import { GameSession } from "./session.js";
import { createSoloApp } from "./solo-app.js";
import { createStudentApp } from "./student-app.js";

/** Every route that can change the game for everyone — the griefing surface. */
const FLOW_ROUTES = [
  { method: "POST", path: "/api/next" },
  { method: "POST", path: "/api/skip" },
  { method: "POST", path: "/api/reveal" },
  { method: "POST", path: "/api/pool" },
  { method: "GET", path: "/api/pool" },
  { method: "POST", path: "/api/timer" },
  { method: "GET", path: "/api/timer" },
  { method: "GET", path: "/api/modules" },
] as const;

const TMP = process.env.TMPDIR ?? "/tmp";

function makeService(mode: "classroom" | "solo") {
  // A throwaway sessions directory: these tests exercise routing, not persistence.
  const dir = `${TMP}/edugame-routes-test-${mode}-${process.pid}`;
  return new GameService(() => {
    const id = `test-${mode}`;
    return { session: new GameSession(id, "seed", defaultRegistry), writer: new SessionWriter(dir, id) };
  }, mode);
}

/** Start `app` on an ephemeral loopback port and hand it to `body`, then shut it down. */
async function withServer(app: Express, body: (base: string) => Promise<void>): Promise<void> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await body(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/** `res.json()` is `unknown`; these tests assert on shapes the API owns, so name it loosely. */
const json = async (res: Response): Promise<any> => res.json();

const call = (base: string, method: string, path: string) =>
  fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });

test("the tunneled student app mounts no flow control", async () => {
  // No static bundle is served here, so a 404 unambiguously means "no such route" rather than
  // the SPA catch-all returning index.html.
  await withServer(createStudentApp(makeService("classroom"), null), async (base) => {
    for (const { method, path } of FLOW_ROUTES) {
      const res = await call(base, method, path);
      assert.equal(res.status, 404, `${method} ${path} must not exist on the student server`);
    }
  });
});

test("the tunneled student app exposes no analytics", async () => {
  // /analytics returns every student's name and score — the actual privacy surface.
  await withServer(createStudentApp(makeService("classroom"), null), async (base) => {
    assert.equal((await call(base, "GET", "/api/analytics")).status, 404);
  });
});

test("student routes still work on the student app", async () => {
  await withServer(createStudentApp(makeService("classroom"), null), async (base) => {
    const state = await json(await call(base, "GET", "/api/state"));
    assert.equal(state.mode, "classroom");
    const join = await fetch(`${base}/api/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Student" }),
    });
    assert.equal(join.status, 200);
    assert.ok((await json(join)).token);
  });
});

test("the educator app has flow control", async () => {
  await withServer(createEducatorApp(makeService("classroom"), null, defaultRegistry), async (base) => {
    for (const { method, path } of FLOW_ROUTES) {
      assert.notEqual((await call(base, method, path)).status, 404, `${method} ${path} must exist for the educator`);
    }
  });
});

test("the solo app has both player and flow routes, and reports solo mode", async () => {
  await withServer(createSoloApp(makeService("solo"), null, defaultRegistry), async (base) => {
    const state = await json(await call(base, "GET", "/api/state"));
    assert.equal(state.mode, "solo");
    for (const { method, path } of FLOW_ROUTES) {
      assert.notEqual((await call(base, method, path)).status, 404, `${method} ${path} must exist in solo`);
    }
    assert.notEqual((await call(base, "GET", "/api/progress")).status, 404);
  });
});

test("the solo app still withholds everyone-else's analytics", async () => {
  // Solo has one learner, who reads their own results via /progress. Not mounting /analytics
  // keeps the roster-wide view exclusive to the educator server.
  await withServer(createSoloApp(makeService("solo"), null, defaultRegistry), async (base) => {
    assert.equal((await call(base, "GET", "/api/analytics")).status, 404);
  });
});

test("a solo learner can run a whole question cycle with no join", async () => {
  // The end-to-end reason solo exists: pick a module, draw, answer, reveal — no educator, and
  // crucially no join. The participant is seeded, so the fixed token works straight away. This is
  // the regression guard for the stale-token bug: a restart re-seeds, so this never 401s.
  await withServer(createSoloApp(makeService("solo"), null, defaultRegistry), async (base) => {
    const post = (path: string, body: unknown) =>
      fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    const first = defaultRegistry.catalog()[0]!;
    await post("/api/pool", { moduleIds: [first.id] });

    const started = await json(await post("/api/next", {}));
    assert.equal(started.phase, "question");
    assert.ok(started.question.options.length > 0);

    // Submit under the fixed solo token without ever calling /join.
    const answered = await post("/api/answer", { token: SOLO_STUDENT_TOKEN, submission: { optionId: started.question.options[0].id } });
    assert.equal(answered.status, 200);

    const revealed = await json(await post("/api/reveal", {}));
    assert.equal(revealed.phase, "revealed");
    assert.equal(revealed.locked, true);

    const progress = await json(await fetch(`${base}/api/progress?token=${SOLO_STUDENT_TOKEN}`));
    assert.equal(progress.answered, 1);
  });
});

test("solo seeds the fixed participant; classroom leaves that token inert", () => {
  // The seed is what makes the fixed token safe: only the solo service knows it. A guessable
  // constant that also worked on the tunneled classroom server would be a griefing hole.
  assert.equal(makeService("solo").session.hasStudent(SOLO_STUDENT_TOKEN), true);
  assert.equal(makeService("classroom").session.hasStudent(SOLO_STUDENT_TOKEN), false);
});

test("naming a solo learner relabels the same fixed participant", async () => {
  // /join in solo doesn't mint — it renames the one seeded participant and returns the constant.
  await withServer(createSoloApp(makeService("solo"), null, defaultRegistry), async (base) => {
    const res = await json(
      await fetch(`${base}/api/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Ada" }) }),
    );
    assert.equal(res.token, SOLO_STUDENT_TOKEN);
    assert.equal(res.name, "Ada");
  });
});

/**
 * The student bundle contains both shells and must pick one before it renders. It used to ask
 * over HTTP, and a single failed request silently rendered the *classroom* app on the solo
 * server. The mode now ships in the document, so these assert the document.
 */
test("the served document names the mode it was served by", async () => {
  const dist = `${TMP}/edugame-dist-test-${process.pid}`;
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(`${dist}/index.html`, "<!doctype html><html><head><title>t</title></head><body></body></html>");

  await withServer(createSoloApp(makeService("solo"), dist, defaultRegistry), async (base) => {
    const html = await (await fetch(base)).text();
    assert.match(html, /<meta name="edugame-mode" content="solo">/);
  });

  await withServer(createStudentApp(makeService("classroom"), dist), async (base) => {
    const res = await fetch(base);
    const html = await res.text();
    assert.match(html, /<meta name="edugame-mode" content="classroom">/);
    // A cached document would be a cached answer about which app to render.
    assert.match(res.headers.get("cache-control") ?? "", /no-store/);
    // Deep links (client-side routes) must get the stamped document too, not a bare file.
    const deep = await (await fetch(`${base}/progress`)).text();
    assert.match(deep, /content="classroom"/);
  });

  fs.rmSync(dist, { recursive: true, force: true });
});

test("a module registry the engine has never heard of composes the same way", () => {
  // Guards the plugin boundary: the solo app takes any registry, same as the educator app.
  const registry = createRegistry([]);
  assert.doesNotThrow(() => createSoloApp(makeService("solo"), null, registry));
});
