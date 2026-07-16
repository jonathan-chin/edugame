# EduGame

A free, open-source, Kahoot-style classroom game with **programmatically generated
questions**. Students join from their own devices, vote on a shared question shown on
the projector, and the educator controls when to reveal the answer and advance. Every
session's analytics are written live to an open **CSV** (plus a JSON manifest), and the
educator sees real-time charts of performance by student, category, and skill.

It is also a deliberate example of an **effective, ethical human + AI workflow** — see
[COLLABORATION.md](COLLABORATION.md), which records the design decisions (human) and the
implementation (AI) verbatim.

## What makes it different

- **Infinite questions.** Questions come from pluggable *modules* that generate fresh
  question/answer objects on the fly. Two ship today — **standard deviation** and
  **box-and-whisker plots** — each producing two sub-skills (read one graphic vs. compare
  four). Adding a module is a one-line registry change plus a renderer.
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
- **Live, self-healing roster.** Student names are unique per session; students send a
  heartbeat, so the count drops within a few seconds when someone logs out, closes the tab, or
  loses connection. Students can log out; the educator can end a game (finalizing its files),
  log everyone out, and start fresh in one click.

## Architecture

A Yarn-workspaces monorepo with four packages:

| Package | Role |
| --- | --- |
| [`shared/`](shared) | The typed contract: question-module interface, content model, analytics/CSV shapes, seeded RNG, content checks, WebSocket protocol. Imported by everything. |
| [`api/`](api) | Express. Two HTTP servers sharing one in-memory session: a **student** server (bound `0.0.0.0`, tunneled — serves the student bundle + student API) and an **educator** server (bound `127.0.0.1` — control + analytics). WebSockets push live state. |
| [`student/`](student) | Ionic React app: join by name, answer, personal progress. Served by the API (same-origin → no ngrok URL baked in). |
| [`educator/`](educator) | Ionic React app (localhost): flow control, live analytics (Recharts), drag-to-anonymize toggle, and a projector view (question + join QR for the class). |

**Question graphics are server-rendered SVG.** Modules build the SVG in `shared/` (see
`distributions.ts` + `svg.ts`) and ship the finished markup in the question `Content`;
clients just inject it inline (theming survives via CSS variables). This keeps the student
app free of any charting library and lets a new module invent any visual without client
changes. Recharts is used only for the educator's analytics dashboards.

Stack: TypeScript, Express, Ionic React + Ionicons, React Hook Form, TanStack Query,
Recharts (educator analytics only), `ws`, and `@ngrok/ngrok`.

### How the ngrok-URL problem is solved

The student bundle is served **by the API itself**, so the app is same-origin with its
API and simply calls `window.location.origin`. Nothing needs the ngrok URL baked in. The
educator's projector view renders a QR of the public origin for the class to scan.

## Running it

Prerequisites: Node 22+, Yarn 4 (`corepack enable`), and — for remote access — an
[ngrok](https://ngrok.com) account with `NGROK_AUTHTOKEN` set in your environment.

```bash
yarn install
yarn start                 # build everything, boot the API, open the tunnel + educator app
yarn start classroom-42    # ...with a fixed reproducibility seed
yarn start --no-tunnel     # LAN only (no ngrok); students use http://<your-ip>:4000
yarn start --skip-build    # reuse existing bundles (faster relaunch)
```

`yarn start` will:

1. Build `shared` + both client bundles.
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
  studentName, questionId, moduleId, skill, difficulty, submission, isCorrect`).
- `<session>.meta.json` — session manifest: the **seed**, timings, modules used, and a
  `questions[]` record of every revealed question — prompt/option text, the **correct answer**,
  and (for graphics) a `path` to a sidecar SVG. Captured at reveal time, so a session is
  self-describing even if a module's generation isn't reproducible from the seed.
- `<session>/` — sidecar asset files (the server-rendered SVGs) referenced by the manifest;
  text and answers stay inline, only graphics are externalized to keep the JSON lean.

## Development

```bash
yarn workspace @edugame/shared dev      # tsc --watch
yarn workspace @edugame/api dev         # tsx watch (STUDENT_DIST/EDUCATOR_DIST optional)
yarn workspace @edugame/student dev     # Vite dev server (proxies /api + /ws to :4000)
yarn workspace @edugame/educator dev    # Vite dev server (proxies to :4100)
yarn typecheck                          # typecheck all workspaces
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

MIT.
