# EduGame

A Kahoot-style classroom game with **programmatically generated questions**, free for
non-commercial use. Students join from their own devices, vote on a shared question shown on
the projector, and the educator controls when to reveal the answer and advance. Every
session's analytics are written live to an open **CSV** (plus a JSON manifest), and the
educator sees real-time charts of performance by student, category, and skill.

It is also a deliberate example of an **effective, ethical human + AI workflow** — see
[COLLABORATION.md](COLLABORATION.md), which records the design decisions (human) and the
implementation (AI) verbatim.

## What makes it different

- **Infinite questions.** Questions come from pluggable *modules* that generate fresh
  question/answer objects on the fly — never a fixed list. Seventeen ship today: two **statistics**
  modules (standard deviation, box-and-whisker, with graphical/numerical sub-skills), eight
  **tech-interview vocabulary** modules — developer, QA, IT, and security, each split into
  Beginner and Advanced — and seven **course-week vocabulary** modules built from a lecture series'
  own slides. See [Question modules](#question-modules-the-plugin-ecosystem).
- **No database.** Analytics stream to a flat CSV; questions are generated in memory.
- **Reproducible.** A single RNG seed regenerates an entire session's questions. Pass it
  on the command line (or let a UUID be assigned) — it's recorded in the manifest.
- **Private by construction.** The educator's control API and full analytics live on a
  **localhost-only** port that is never tunneled. Only the student app + student API are
  exposed publicly.
- **Optional per-question timer.** The educator can set an auto-reveal countdown; when it
  expires the **server** locks answering and reveals the answer — enforced server-side, so a
  client clock can't extend it. Clients render a live countdown (skew-corrected). 0 = off
  (manual reveal, the default).
- **Solo study mode.** `yarn start --solo` runs the same question modules for one person: one
  loopback-only port, no tunnel, no educator app — pick your modules, tap to answer, with optional
  answer and auto-advance timers. See [Solo study](#solo-study).
- **Live, self-healing roster.** Student names are unique per session; students send a
  heartbeat, so the count drops within a few seconds when someone logs out, closes the tab, or
  loses connection. Students can log out; the educator can end a game (finalizing its files),
  log everyone out, and start fresh in one click.

## Architecture

A Yarn-workspaces monorepo. The first three packages exist to keep question modules at arm's
length from the engine:

| Package | Role |
| --- | --- |
| [`module-api/`](module-api) | **The contract** a question module implements: content model, seeded RNG, question/answer types, the `QuestionModule` interface, the registry factory. Depends on nothing. |
| [`modules/`](modules) | **The plugins** — the stock question modules, plus their private chart/statistics helpers. Depends only on the contract. See [`modules/README.md`](modules/README.md). |
| [`shared/`](shared) | Game-level types both servers and clients agree on: live state, WebSocket protocol, analytics/CSV shapes, session recording, name checks. Re-exports the contract; names no module. |
| [`api/`](api) | Express. Two HTTP servers sharing one in-memory session: a **student** server (bound `0.0.0.0`, tunneled — serves the student bundle + student API) and an **educator** server (bound `127.0.0.1` — control + analytics). In solo mode, one loopback-only server instead. WebSockets push live state. |
| [`student/`](student) | Ionic React app: join by name, answer, personal progress. Served by the API (same-origin → no ngrok URL baked in). Carries the solo shell too, selected by server-reported mode. |
| [`educator/`](educator) | Ionic React app (localhost): flow control, live analytics (Recharts), drag-to-anonymize toggle, and a projector view (question + join QR for the class). |
| [`reports/`](reports) | Command-line report generator: turns recorded sessions into per-student and whole-class **PDF** summaries. |

**Question graphics are server-rendered SVG.** Modules build the SVG themselves (see
`modules/src/svg.ts` + `distributions.ts`) and ship the finished markup in the question `Content`;
clients just inject it inline (theming survives via CSS variables). This keeps the student
app free of any charting library and lets a new module invent any visual without client
changes. Recharts is used only for the educator's analytics dashboards.

Stack: TypeScript, Express, Ionic React + Ionicons, React Hook Form, TanStack Query,
Recharts (educator analytics only), `ws`, and `@ngrok/ngrok`.

### How the ngrok-URL problem is solved

The student bundle is served **by the API itself**, so the app is same-origin with its
API and simply calls `window.location.origin`. Nothing needs the ngrok URL baked in. The
educator's projector view renders a QR of the public origin for the class to scan.

## Question modules (the plugin ecosystem)

A module is a self-contained plugin. It generates questions, grades them, and says what to reveal —
and **the engine knows nothing about any of it**. `GameSession` is handed a registry rather than
importing one, so the core has no opinion about which modules exist:

```ts
import { createRegistry } from "@edugame/module-api";
const registry = createRegistry([myModule]);
new GameSession(id, seed, registry);
```

The whole contract is one object:

```ts
export const myModule: QuestionModule = {
  id, title, shortTitle, description,
  generate(rng) { /* → { public, key } */ },
  grade(key, submission) { /* correctness is yours */ },
  reveal(key) { /* what clients highlight */ },
};
```

Because `grade` and `reveal` belong to the module, the engine never inspects an answer key — a
module can define correctness however it likes without a core change. Two constraints are worth
knowing up front: **all randomness must come from the injected `rng`** (a session replays from its
seed), and every question is **multiple-choice** for now, since a browser client can only collect
an interaction it has a widget for.

**Start from [`modules/src/template.ts`](modules/src/template.ts)** — a complete, working, commented
module, compiled and type-checked with the package but deliberately left out of the manifest so it
never appears in the picker. [`modules/README.md`](modules/README.md) has the full guide: the rules
that matter, how to register, and what to assert when checking your own module.

## Solo study

The same engine, for one person revising on their own:

```bash
yarn start --solo          # one URL: http://localhost:4500, localhost only
yarn report --solo         # a study report from those sessions
```

Solo skips the tunnel and the educator app entirely and prints a single URL, on its own port
(4500) so it never collides with a classroom run. The student bundle serves a different shell —
chosen from a `mode` the **server** stamps into the served HTML, never a build flag and never a
fetch the client could lose.

**The study flow.** You name yourself once (it only labels your report — click the name in the
header to change it), then the first screen is a setup: tick which modules to draw from and set
two optional timers. Then you study: **tapping an option is your answer** — it commits, reveals,
and stops the clock in one gesture (no separate "check" step, no changing your mind). "Next
question" moves on.

**The two timers.**

- *Time to answer* — the existing per-question countdown, **enforced server-side** (it locks and
  reveals when it expires, so a client clock can't extend it).
- *Auto-advance after answer* — draws the next card on its own once the answer shows, with a
  pause. This one is client-side (one learner, nothing to enforce). **Failsafe:** if the answer
  timer runs out with no pick, auto-advance does **not** start — you may have walked away, and it
  won't run the game (burning any per-question resources) unattended; it waits for a manual click.

**Why it's a separate app, not a flag.** Flow control (`next`, `skip`, `reveal`, `pool`, `timer`)
is what a classroom student must never reach — not because it leaks anything, but because it would
let one student spoil answers or skip questions for everyone. Nothing authenticates those routes;
they are simply **not mounted on the server students can reach**. Solo is a separate app
(`createSoloApp`) on a loopback-only listener, so there is no runtime state in which the tunneled
server has them. And solo has no roster to log into: it seeds a single participant under a fixed
token (`SOLO_STUDENT_TOKEN`) so there is no join and nothing to go stale across a restart — a token
the tunneled classroom server never seeds, so it is inert there.
[`api/src/routes.test.ts`](api/src/routes.test.ts) asserts that route *absence* (and the token's
inertness in classroom), which no typechecker can:

```bash
yarn test
```

Solo sessions are stamped `mode: "solo"` in their manifest, and the two report runs read
different sets — private practice never lands in a class report, where it would shift the mean
and the standing plot everyone else is measured against.

## Running it

Prerequisites: Node 22+, Yarn 4 (`corepack enable`), and — for remote access — an
[ngrok](https://ngrok.com) account with `NGROK_AUTHTOKEN` set in your environment.

```bash
yarn install
yarn start                 # build everything, boot the API, open the tunnel + educator app
yarn start classroom-42    # ...with a fixed reproducibility seed
yarn start --no-tunnel     # LAN only (no ngrok); students use http://<your-ip>:4000
yarn start --skip-build    # reuse existing bundles (faster relaunch)
yarn start --solo          # solo study: http://localhost:4500, no tunnel (see above)
```

`yarn start` will:

1. Build `module-api`, `shared`, `modules` + both client bundles.
2. Start the API — student server on **:4000** (tunneled), educator server on **:4100**
   (localhost only). If either port is already in use, the launcher automatically advances to
   the next free one and prints the port it settled on.
3. Open an ngrok tunnel to **:4000** only and push the URL to the educator app.
4. Open the educator app at `http://localhost:4100`.

Keep the **educator** window on your laptop; open its **projector view** (the "Open projector
view" link, or `/projector`) on the class display — it shows the join QR plus the current
question for reference.

### Analytics output

Per session, written to `sessions/`:

- `<session>.csv` — one row per graded answer (`timestamp, session, studentToken,
  studentName, questionId, moduleId, skills, difficulty, submission, isCorrect`). A question may
  carry several skills, so that column is pipe-joined (`Definitions|Distinctions`).
- `<session>.meta.json` — session manifest: the **seed**, timings, modules used, and a
  `questions[]` record of every revealed question — prompt/option text, the **correct answer**,
  and (for graphics) a `path` to a sidecar SVG. Captured at reveal time, so a session is
  self-describing even if a module's generation isn't reproducible from the seed.
- `<session>/` — sidecar asset files (the server-rendered SVGs) referenced by the manifest;
  text and answers stay inline, only graphics are externalized to keep the JSON lean.

`yarn report` turns any date range of those sessions into PDF summaries — one for the class and one
per student, each recreating the questions asked. Reports and `sessions/` are gitignored, since they
carry student names.

`yarn report --solo` writes only the per-student reports, and omits the class-standing plot from
them: with a single learner there is no class to report on and nothing to be ranked against.

## Development

```bash
yarn workspace @edugame/module-api dev  # tsc --watch (the contract)
yarn workspace @edugame/modules dev     # tsc --watch (the question modules)
yarn workspace @edugame/shared dev      # tsc --watch
yarn workspace @edugame/api dev         # tsx watch (STUDENT_DIST/EDUCATOR_DIST optional)
yarn workspace @edugame/student dev     # Vite dev server (proxies /api + /ws to :4000)
yarn workspace @edugame/educator dev    # Vite dev server (proxies to :4100)
yarn typecheck                          # typecheck all workspaces
yarn test                               # API route-surface tests (what each server exposes)
yarn report                             # generate PDF reports from recorded sessions
```

## Known limitations (by design or noted)

- Content filtering is a best-effort classroom deterrent, not a safety guarantee. The wordlist
  is a substring match, so it can over-block real names (e.g. "Di**ck**ens") — the classic
  Scunthorpe problem; an allowlist covers common cases.
- Names must be unique per session and identity is a display name + opaque token — not
  authenticated. Uniqueness is a light deterrent, not real protection against impersonation.
- CSV persistence is append-only and not crash-transactional (the intended no-database
  approach).
- Free ngrok may show a one-time browser interstitial; API calls send
  `ngrok-skip-browser-warning` to avoid it on requests.

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) — free to use, modify, and
share for any **noncommercial** purpose, which explicitly includes schools and other educational
institutions, nonprofits, research, and personal/hobby projects. Commercial use is not granted;
contact the author for commercial licensing.
