# Collaboration Log

This project is, in part, a working example of how AI can be incorporated into a
software development workflow **effectively and ethically**. Part of being ethical
is being transparent about who did what. This file is the honest record.

## Division of labor

The guiding principle is a deliberate split of responsibility:

| Domain of the human (Jon) | Domain of the AI (Claude) |
| --- | --- |
| Design | Creating (implementation) |
| Architecture | Debugging |
| Vision | Documenting |
| Purpose | Surfacing concerns |

The human owns *what* is built and *why*. The AI owns *how* it is built, keeps it
working, writes it down, and raises risks early so the human can make informed
decisions. Every consequential decision below was made by the human; the AI
proposed options, gave recommendations, and flagged trade-offs.

This log is maintained verbatim as the project evolves. It is not a summary — it is
the actual prompts and the actual back-and-forth, so a reader can see exactly where
the human steered and where the AI executed.

---

## Session 1 — Kickoff and design decisions

### Human — original prompt

> ok, help me develop a new project. the overarching idea is a free, open source
> educational tool / game that is in the style of Kahoot. the educator can run a
> server locally, tunnel it to a public provider like ngrok, have students log in,
> and vote on answers to a common shared question projected on the board. the
> educator has the ability to control when to reveal the answer and when to move on
> to the next question. the educator is also able to gather statistics about who is
> answer, the kinds of questions that are scoring low or high, etc, that is saved in
> an open source file type, like a csv.
>
> I imagine it divided into 3 major chunks:
>
> - the api server which serves the student client app, provides questions and
>   answers, has endpoints for the educator client app, and tracks analytics. I'd
>   prefer this to be written with express.
> - the student client app that reads the current question from the api server and
>   displays it, along with answers. students are asked to enter their name before
>   beginning. they can change their answer at any time before the educator has
>   chosen ot reveal the correct answer. students may also view their own progress;
>   at the basic level, this is how many questions they have answered correctly and
>   their overall percentage. at a deeper level, this will breakdown the same
>   statistics across question categories and skill types.
> - the educator client app that will allow the educator to control the overall flow
>   of the game. namely, this is when to show the correct answer, which will lock out
>   students from changing their answer or submitting answers if they haven't
>   already. also, it will display running analytics of individual student
>   performance, performance across question categories, etc.
>
> the entire project is designed to be run on 2 screens: the class projector which
> will show an example student client app and the educator's laptop, which will be
> running the educator client app and will not be viewable by the class.
>
> the key standout feature will be that the questions will be programmatically (and
> therefore, theoretically, infinitely) generated. the mechanics of students voting
> on answers and the educator controlling the flow of questions will stay as a core
> feature. there will be plugable, extensible modules that generate questions and
> answers. there will flexibility in things like how the question is displayed (text,
> image, audio, or some combination) as well as for the answers (how many, whether
> it's multiple choice or value input, if the multiple choice is text, image, etc).
> these question modules will define their own way of creating question / answer
> objects and will also provide metadata, like question category and which answer is
> correct. the educator client app will also have control over switching to different
> question modules on the fly while aggregating analysis across all question
> categories during a particular session. here are a few question modules to start
> off with:
>
> **graphical literacy with standard deviation**
> question will display a bell curve with a particular standard deviation. curves can
> also demonstrate skewedness or outliers. there will be 4 possible answers that are
> always the same: near zero standard deviation, small standard deviation, large
> standard deviation, very large standard deviation.
>
> **numerical literacy with standard deviation**
> this is basically the inverse of the previous module. a question will prompt a
> specific standard deviation category: near zero, small, large, very large. the
> answer options will be various bell curves, which may also exhibit things like
> skewedness or outliers.
>
> 2 more modules with box-and-whisker plots, similar to the previous two modules.
> this time, instead of deviation types, they would be min, max, Q1, Q2, and Q3
> values.
>
> analytics from each game session will automatically be saved as a flat csv file.
> they will also be visualized on the educator client app, updating in real time.
> additionally, there will be slide toggle that will temporarily anonymize students'
> name so that the educator can show this analytics slide to the students. the toggle
> will need to be clicked-and-dragged left or right to disable or enable
> anonymization, so that a stray click will not accidentally expose student names.
>
> both client apps should be fairly minimal, preferring a clean, sleek appearance.
> they should use Ionic components, Ionic Icons, and reCharts for interface
> components and react hook form and tanstack query for api calls. there should be
> built in profanity and content checks against all inputs, such as the user's name
> and any answers where appropriate. these checks should happen both on client side
> and the api server. there should be no database; answers for analytics should be
> written directly to a csv file in real time and questions should be generated on
> the fly.
>
> the project should be structured as a monorepo. there should be 3 directories at
> the root, one for each major section. there should be a package.json file at the
> monorepo root with a single script command that runs everything.
>
> the orchestration is tricky: the api server needs to be spun up first. the educator
> client app can just make calls on localhost. however, in order for the student
> client app to be accessed remotely, it needs to know the ngrok url of the api
> server. this will change every time. additionally, the generated artifact files
> will need to be accessible to students on their own laptops. ideally, these
> artifacts are generated fresh every time on demand, baking in the ngrok url of the
> api server at the time. maybe this is served to students on the same api express
> server, at a specific rout?
>
> one last thing is that I want this project to also serve as a working example of
> how AI usage can be effectively and ethically incorporated into software
> development workflows. to achieve this, I want you to include this prompt and all
> subsequent back and forth in a file available on the monorepo root. I want to
> highlight the division of labor between you and me: design, architecture, vision,
> and purpose are all within my domain while creating, debugging, documenting, and
> surfacing concerns are within your domain. working together, we can make this a
> successful reality.
>
> begin by asking me clarifying questions.

### AI — clarifying questions (round 1) and Human decisions

The AI noted the spec was already largely self-consistent and asked four questions
that would materially change the build. The human decided:

1. **Student join model** → **One session, name only.** The server runs one live
   game at a time; a student opens the tunneled URL, types a name, and is in.
2. **Educator endpoint protection** (the API is publicly reachable via ngrok) →
   **Separate localhost-only port.** Two listeners: the student API on the tunneled
   port, the educator/admin API bound to `127.0.0.1` and never tunneled. The public
   internet physically cannot reach control endpoints.
3. **Live updates transport** → **WebSockets.**
4. **Language** → **TypeScript** throughout.

### AI — clarifying questions (round 2) and Human decisions

The AI presented a set of default assumptions (Yarn/Vite tooling, serving the
student bundle from Express to eliminate URL-baking, the module contract shape, the
CSV schema, content-check strategy, this collaboration log) and asked two more
forks. The human decided:

5. **Scoring** → **Binary correct/incorrect.** Score is percentage correct, broken
   down by category and skill.
6. **Shared code** → **Add a `shared/` package.** Four top-level dirs (`api`,
   `student`, `educator`, `shared`). The module contract, analytics types, and
   profanity list live once in `shared/`. This is a deliberate, human-approved
   deviation from the original "exactly 3 directories" instruction.

### AI — concerns raised (on the record)

1. Free ngrok shows an interstitial browser-warning page and rate-limits; API calls
   need an `ngrok-skip-browser-warning` header. **Human:** hasn't hit it before;
   watch for it and solve if it appears.
2. Name-only identity is spoofable/collision-prone. **Mitigation (approved):** issue
   an opaque per-student token in `localStorage`; the name is display-only and
   analytics key on the token; warn on duplicate names.
3. CSV-as-only-store is not crash-durable (append-only, no transactions).
   **Human:** understood, this was the intended approach.
4. Content filtering is best-effort, not a safety guarantee. **Human:** fine.
5. Question state must be session-pinned so all clients see the identical generated
   instance and reconnects resume. **Human:** yes — and add an optional **RNG seed**
   to the startup command (UUID if omitted), recorded for reproducibility.
6. Getting the URL to students: show a **QR code** on the projector. **Human:** yes.

### Human — follow-up adjustments

> 1. do not use npm. use yarn.
> 2. let's try your solution to the ngrok url problem
>
> (answers to concerns as recorded above; on #5 the human added the RNG-seed
> requirement and asked whether a different file format is needed for session
> metadata.)

### AI — recommendation on session metadata format (accepted)

A flat CSV is a poor home for session-level metadata like the seed. Decision: keep
the **per-answer event log as CSV**, and write a companion **`*.meta.json` manifest
per session** holding session-level facts (`seed`, start/end time, modules used, app
version, student count). CSV rows carry a `session` id linking to the manifest. The
seed is threaded through a PRNG so question generation is fully reproducible.

### Agreed structure and run flow

```
edugame/
├─ package.json         # Yarn workspaces + root "dev" (concurrently)
├─ COLLABORATION.md      # this file
├─ shared/              # module contract, analytics types, profanity list, seeded RNG
├─ api/                 # Express: student API (tunneled) + educator API (localhost-only)
│                        #  + WebSockets + serves student bundle + CSV/JSON writer + module registry
├─ student/            # Ionic React: join, question, answer, personal progress
└─ educator/           # Ionic React (localhost only): flow control, live analytics, drag-to-anonymize
```

**Run flow:** `yarn dev [seed]` → build & start API (student port + educator
localhost port) → serve student bundle statically → start ngrok on the student port
→ launch educator app against localhost. Students scan a QR code on the projector.

### Human — follow-up on assumptions

> let's go back to some assumptions first:
> 1. do not use npm. use yarn.
> 2. let's try your solution to the ngrok url problem
>
> (plus the point-by-point answers to the six concerns, recorded above; and: "yes, the
> structure and flow look good to me. let's begin, unless you have more clarifying
> questions.")

### AI — implementation (this session)

With the design locked, the AI implemented and **verified end-to-end** the following.
Division of labor held: every decision above was the human's; the code, tests, and the
verification below were the AI's.

- **`shared/`** — content model, question-module contract + `grade()`, seeded RNG
  (xmur3 + mulberry32), stats helpers (skew-normal density, five-number summaries),
  analytics/CSV contract, `checkName`/profanity, WebSocket protocol, and the four
  modules behind a registry.
- **`api/`** — two Express servers over one in-memory `GameSession` (student on
  `0.0.0.0`, educator on `127.0.0.1`), WebSocket hubs, a `GameService` that decides what
  broadcasts to whom, an append-only CSV writer + JSON manifest, and QR generation.
- **`student/`** — Ionic React: join (React Hook Form via `Controller` for Ionic inputs,
  shared `checkName` client-side), live play with Recharts/SVG chart rendering, and a
  personal progress view. Served same-origin by the API.
- **`educator/`** — Ionic React: flow control with a live vote tally, Recharts analytics,
  and the drag-to-confirm anonymization toggle (display-only masking).
- **`scripts/orchestrate.mjs`** — `yarn start [seed] [--no-tunnel] [--skip-build]`:
  build → boot API → open ngrok on the student port only → push URL → open educator app.

**Verification performed:** the full server flow via curl (join, profanity rejection,
generation of all four modules, answer, live count, reveal + lockout, grading,
analytics, per-student progress, CSV + manifest, QR, localhost binding); typecheck of
all workspaces and production builds of both clients; and a live browser run driving the
real UIs — educator starts a question, student joins via the QR screen and answers,
educator reveals and the student sees the graded result over the WebSocket, the progress
and analytics views render, and the drag-to-anonymize toggle flips `Jordan` → `Student 1`.
Seed reproducibility was confirmed (identical question IDs across runs of one seed).

**Concerns surfaced during implementation (AI domain):**
- Ionic inputs emit `onIonInput`, not native `onChange`; React Hook Form's `register`
  silently fails on them, so `Controller` is used instead.
- The classic `ngrok` npm package needs a postinstall binary download, which Yarn 4
  disables by default; switched to `@ngrok/ngrok` (prebuilt native addon).
- Client bundles exceed Vite's 500 kB warning (Ionic is large); acceptable for
  classroom/LAN/tunnel use, noted for future code-splitting.
- The bell-curve/box-plot React renderers are mirrored in both clients; the underlying
  math lives once in `shared/` so it cannot drift.

### Human — question-design fix (numerical SD module)

The human noticed that the numerical/identify SD question ("Which distribution shows a
small standard deviation?") was confusing: the correct answer was the `small` bucket, but
a `near-zero` spike was also on screen, and both read as "small" in plain English.

**AI (concern surfaced):** confirmed it was not a grading bug — the module used four
fixed *named buckets* (`near-zero` 0.2–0.45, `small` 0.9–1.5, `large` 2.6–3.6,
`very-large` 5.0–6.5) and asked for one specific bucket. The ambiguity was real: the two
smallest buckets overlap semantically, and the identify module hid the labels, forcing an
impossible "is this the small one or the very-small one?" comparison.

**Human decision:** reframe the module as a *relative superlative* — "Which of the
following distributions has the largest / smallest standard deviation?" No bucket-naming,
so no ambiguity; the answer is simply the extreme shown.

**AI implementation:** rewrote `stdev-numerical` to draw one clean curve per bucket (four
well-separated spreads, single unambiguous extreme) and ask largest/smallest. Added a
`{ clean }` option to `buildCurve` so comparison curves carry no skew/outlier noise.
Verified over 500 generations that the marked-correct option is always the σ extreme, and
confirmed the new question renders in the browser. This also makes the module consistent
with the box-plot identify module, which already uses superlative comparisons.

_Note left open: the graphical single-curve module still asks students to classify one
curve into a named bucket (labels visible). That's a separate, more defensible exercise,
but the near-zero/small distinction there remains subtle — revisit if desired._

### Human — rendering architecture + variety

> ok, let's modify this further. first, remove the outlier indicators… the red dots. then,
> let's have a MUCH greater variety in the kinds of graphs. they're all kind of same-y.
> in fact, is the question generator creating an entire dataset? … it might be better to
> generate svgs and send those to the clients rather than the clients generating via
> recharts … if we do this, we can remove recharts dependency on the client?

**AI (clarification + concern):** corrected the premise — the generator was sending ~5
numbers, not a dataset, so server-SVG isn't a wire-efficiency win (it's slightly larger);
the real wins are flexibility (a module can emit any visual), dropping client chart code,
and consistency. Confirmed Recharts could go.

**Human decisions:**
- Keep Recharts in the **educator** app for the analytics dashboards only; render
  **questions** as server SVG and drop Recharts from the **student** app.
- Vary the **distribution shapes**, but keep a single consistent render style.
- Remove the red outlier dots.

**AI implementation:**
- `shared/distributions.ts` — families (normal, skew, triangular, uniform, bimodal,
  heavy-tail) with a numeric-integration σ measurement; `makeDistribution` rescales each
  shape so its σ is *exactly* the target, which keeps "largest/smallest σ" unambiguous.
- `shared/svg.ts` — server-side SVG string renderers (filled density + baseline axis; box
  plot with no outliers), colored via CSS variables so they still adopt the client theme.
- `Content` gained a `kind: "svg"` variant (replacing the parametric `chart` variant);
  clients inject it inline. Deleted the Recharts/`charts.tsx` renderers from both apps.
- All four modules now emit SVG. The comparison module draws one shape per spread bucket,
  so the four options are varied in appearance but well-separated in σ.
- Removed Recharts from the student bundle (~390 KB smaller); kept it in the educator app
  for analytics.

**Verified:** all workspaces typecheck; both clients build; live run shows the new
variety (bimodal, uniform/plateau, skewed, smooth bell) with no red dots, box plots
rendering cleanly, and reveal grading the true σ-extreme correctly.

**Concern noted:** for a bimodal/uniform shape, visual "width" and actual σ can diverge —
a legitimate statistical-literacy nuance, but flagged in case the human later wants to
restrict the comparison module to unimodal shapes.

### Human — no angular shapes

> I see that these can be very angular: rectangular, triangular, etc. don't do that. round
> out the edges.

**AI:** replaced the two angular families (`uniform` rectangle, `triangular`) with smooth
analogues built from a *generalized normal* — a `peaked` family (exponent 1.4–1.8: a
sharper but rounded-top peak) and a `plateau` family (exponent 3–4: a rounded flat top).
For any exponent > 1 the top is rounded, never cusped, so no angular edges appear. Variety
is preserved (bell, skewed, peaked, plateau). Verified: 400 draws yield only the four
smooth families, and live questions show only rounded curves.

### Human — bimodal is hard to read

> I noticed there are some graphs generated with 2 peaks. it's hard to intuit what the
> standard deviation is in that case.

**AI:** agreed — a bimodal's σ is set by the gap between peaks, not the width of either
hump, so it can't be read by eye. (The two-peak curves came from the comparison module;
the single-curve classify module was already unimodal-only.) Restricted the σ modules to a
new `SPREAD_LEGIBLE_FAMILIES` set — normal, skewed, triangular, uniform — dropping
`bimodal` **and** `heavy-tail` (whose σ lives in its tails, same problem). The two shapes
remain implemented for any future non-σ module. Verified: 400 draws produce only the four
legible families, and live comparison questions now show only single-peaked shapes.

---

### Human — educator dashboard redesign

> 1. combine the control page and the analytics page into one … two columns … control on
>    the left and analytics on the right.
> 2. put the projector tab as its own page as a separate route … a link … that opens it in
>    a new tab.
> 3. for the modules, … a checkbox select instead of a dropdown … an ion modal … select as
>    many modules as they want. new questions will generate randomly from the pool.
> 4. hide the reveal answer button if the game has not started … when started, align it to
>    the right … a significant gap between next question and reveal answer.

**AI implementation:**
- Dropped the segment tabs; `App.tsx` now renders a two-column CSS-grid dashboard
  (control left, analytics right; stacks under 900px). No router added — the projector is
  a separate path (`/projector`) served by the same bundle via path-based rendering, and
  the control column links to it with `target="_blank"`.
- Module selection is now a **pool**: `IonModal` with a checkbox per module (row-click
  toggles, staged draft committed on "Done"). New questions draw randomly from the pool —
  the choice is made server-side with the **seeded RNG** (`session.setModulePool` /
  `nextQuestion` picks via `rng.pick`), so reproducibility holds. New endpoints:
  `GET/POST /api/pool`.
- The Reveal button is hidden until the game starts (questionNumber > 0), then
  right-aligned (`margin-left: auto`) away from Next question.

**Verified live:** two-column layout at desktop width; module modal toggles and persists
the pool (unchecked box-plot modules → pool `[stdev-graphical, stdev-numerical]`, and Start
then drew an SD question); Reveal hidden in the lobby and right-aligned once started; the
`/projector` route renders standalone with the join QR. No console errors.

---

### Human — dashboard polish + de-brand the code

> 1. visually distinguish the two columns … place each in its own panel div (reuse/extend
>    the class) with a different background color.
> 2. "EduGame" is a working title … generalize any references to the name, such as the
>    classname eg-panel.
> 3. remove the two ion chips on the control panel; render the question number as plain text.
> 4. make the module selection button half width, combined side-by-side with the row above it.
> 5. what's the difference between by category and by skill?

**AI:**
- (5) Explained: category = task type (Graphical vs Numerical literacy); skill = concept
  (Standard deviation vs Box-and-whisker). Two orthogonal groupings of the same answers.
- (2) Renamed the CSS class/variable prefix `eg-`/`--eg-` → **generic unprefixed names**
  (`panel`, `row`, `caption`, `--card`, `--muted`, …) across all client + shared files.
  Course-corrected mid-task: an initial `APP_NAME` constant was over-engineering — reverted
  it; "EduGame" stays hardcoded in the headers (trivial to change later).
- (1) Each dashboard column is now `class="panel column"`, reusing `.panel` and overriding
  the background with a recessed `--column-bg` (#12162b) + subtle border, so the inner
  `.panel` cards (#1a1f36) visibly sit on top.
- (3) Removed the phase/question `IonChip`s; the status is now plain text
  ("Question · Q1 · 0/0 answered").
- (4) The status and the (now half-width) Modules button share one flex row.

**Verified:** typecheck + build all green; live dashboard shows distinct column vs. card
backgrounds (inspected: #12162b vs #1a1f36), plain-text status, half-width Modules button,
and Next/Reveal split; the student app and server-rendered SVGs still render correctly
after the variable rename. No console errors.

---

### Human — "by category" → "by module"?

> is "by category" the module the question came from? if so, rename "by category" to "by module".

**AI:** clarified it was *not* — "by category" is the literacy category (Graphical vs
Numerical, 2 values), whereas the module is finer (4 modules). Delivered the actual intent:
added a concise `shortTitle` to each module ("Std dev — read/compare", "Box plot —
read/identify"), labeled the already-computed `byModule` analytics with it server-side, and
swapped the left analytics chart from **By category** to **By module**. Verified live with a
scripted multi-module game: the chart shows the four modules by short title; "By skill"
unchanged. (Category grouping still exists in the data if wanted back.)

---

### Human — clarified taxonomy; merge modules with sub-skills

> module is the same as the module selection modal. skill is per-question metadata — a
> module could have sub-skills … maybe combine the 2 standard-deviation modules into one
> module with sub-skills (divided how it is originally), and similar for quartiles.

This corrected an earlier misunderstanding. The agreed model: **module** = selectable
topic; **skill** = per-question sub-skill within a module; the old separate `category`
axis is dropped — it *becomes* the skill.

**AI implementation:**
- Collapsed the four modules to **two**: `stdev` ("Standard deviation") and `boxplot`
  ("Box-and-whisker plots"). Each `generate()` random-picks (seeded) one of two sub-skill
  variants, tagging the question's `skill` as **Graphical literacy** (read one graphic) or
  **Numerical literacy** (compare/identify).
- Removed `category` throughout: `QuestionInstance`, `QuestionModule` (no longer owns a
  category/skill), `AnswerEventRow` + the CSV column, `AnalyticsSnapshot.byCategory`,
  `StudentProgress` (→ `byModule`). Analytics now break down **by module** (topic) and
  **by skill** (graphical vs numerical); student progress likewise.
- Deleted the four old module files; the registry now lists the two merged modules.

**Verified:** typecheck all green; generation shows each module yielding both sub-skills
with no `category` leak; live dashboard shows 2 modules in the picker, "By module"
(Standard deviation / Box-and-whisker) and "By skill" (Graphical / Numerical literacy)
charts, and the new CSV header omits `category`. No console errors.

---

### Human — 401 during manual testing

> with both clients running on localhost, I'm receiving a 401 unauthorized error … should
> we store the token only in memory, not localStorage?

**AI diagnosis:** the student browser had a token in `localStorage` from a *previous*
server run; the API keeps sessions in memory only, so after a restart that token is unknown
→ the first token-carrying request (answer or progress) returns 401 (the only 401s in the
API). The reconnection gap flagged on day one.

**AI recommendation (accepted direction):** rather than pure in-memory (which also drops the
token on an accidental in-tab refresh, spawning a duplicate student and losing progress),
use **`sessionStorage`** — survives an accidental reload, cleared on tab close, so each
class starts fresh. Plus a self-heal: any 401 fires a `SESSION_INVALID_EVENT` that clears
the stored token and returns the student to the join screen.

Also added `--student-port` / `--educator-port` flags to the orchestrator (the manual test
had a port already in use).

**Verified live (on alt ports, without touching the running instance):** fresh load → join
screen; join → play; valid token survives a reload (stays in game, no duplicate); a
stale/bogus token on reload self-heals back to the join screen. No console errors.

---

### Human — skip button + reveal→next transform

> upon starting, a question auto-generates. the Next Question button should become a Skip
> Question button — generate a completely new question, discard submitted answers, don't
> increment the count. Reveal Answer stays as is; once clicked it transforms into Next
> Question.

**AI implementation:**
- Split `session.nextQuestion` into `drawQuestion` (pick module, open answering, clear
  submissions) + `nextQuestion` (increment then draw) + new **`skipQuestion`** (draw
  without incrementing; only valid mid-question). Discarding submissions is free — answers
  are only graded/written to CSV on reveal, so an un-revealed question has nothing
  persisted. New endpoint `POST /api/skip`.
- Educator control buttons now branch on phase: **lobby** → "Start game"; **question** →
  "Skip question" (left) + "Reveal answer" (right); **revealed** → "Next question" (the
  reveal button, transformed in place).

**Verified live (alt ports):** skip keeps the question number, swaps in a new question, and
resets answered→0; next increments (Q1→Q2→Q3); the button set transitions correctly through
lobby → question → revealed → question. No console errors. (Also confirmed `--student-port`/
`--educator-port` flags work.)

---

### Human — "Start Game does nothing"

> I press Start Game and nothing happens … restarting the server didn't help.

**AI diagnosis:** could not reproduce on a clean build — `POST /api/next` returns 200 and
the question renders. Root cause is environmental: the educator UI reflected state **only
through the WebSocket**, so if the socket is stale/disconnected (which a server restart
causes) the server advances but the screen never updates. Compounded by a possibly cached
old bundle.

**AI fix (robustness):** the control actions now apply the server's HTTP response directly.
`/next`, `/skip`, and `/reveal` all return the new `PublicGameState`; `useEducatorSocket`
exposes `applyState`, and the next/skip/reveal mutations call it `onSuccess`. So Start /
Skip / Next / Reveal update the view instantly and no longer depend on a live socket. (The
reveal's correct-answer highlight still comes over the socket, which reconnects on its own.)

**Verified:** clean build starts a game (200 + Q1 rendered); `/reveal` now returns state;
the full loop (start → skip → reveal → next) works in the UI. Guidance to the human: rebuild
and hard-refresh to load the new bundle.

---

### Human — indicate the connecting state in the control panel

> the questions panel starts immediately but analytics shows "Connecting…" and the title
> "reconnecting…". I'm fine if the questions panel waits for connection, but show an
> indication — disable the start button and show a loading indicator.

**AI implementation:**
- The control panel now gates on the first game state arriving: while `state === null` the
  Start button is disabled and a spinner + "Connecting…" is shown (matching the analytics
  panel). Once connected it renders normally.
- Fixed the header wording: `useEducatorSocket` now tracks `everConnected`, so the first
  connect reads "· connecting…" and only a later drop reads "· reconnecting…".
- Note: this gates the *initial* load only (state stays non-null after first load), so the
  earlier fix — actions still work if the socket drops mid-game — is preserved.

**Verified live:** with a temporary connect delay, captured the connecting state (header
"connecting…", Start disabled, spinner + "Connecting…"); after reverting, the panel connects
fast and Start is enabled. No console errors.

---

### Human — consolidate into one app-wide loading overlay

> there are so many "connecting…" labels and it feels disjointed. remove them and apply an
> application-wide ion-loading component.

**AI implementation:** replaced every per-panel "Connecting…" label (header note, control
status/spinner, analytics placeholder) with a single `IonLoading` overlay in the educator
Dashboard, shown while the initial state/analytics load (`!state || !analytics`). Panels
render only once loaded, so ControlView/AnalyticsView never see null. Reverted the
now-unused `everConnected` wording plumbing. The overlay is initial-load only (state stays
set afterward), so a mid-game reconnect never re-triggers it and HTTP-driven actions still
work.

**Verified live:** with a temporary connect delay, captured the single centered "Connecting…"
overlay (clean header, panels hidden); after revert, the dashboard loads with no stray labels
and Start still begins a game. No console errors.

---

### Human — apply the same overlay to the student app

> yes, let's keep it consistent

**AI implementation:** mirrored the educator treatment in the student app — removed the
header "· reconnecting…" note and the vestigial "Connecting" text in the lobby waiting
screen, and added a single `IonLoading` overlay shown while the first game state loads
(post-join). The overlay is initial-load only, so the lobby's "Waiting for the teacher…"
game-state message is unaffected.

**Verified live:** with a temporary socket delay, the student shows the same centered
"Connecting…" overlay (header/tabs behind it, no stray labels); after revert, it loads to
"Waiting for the teacher… N joined". A codebase audit confirms only the two intended
`IonLoading` messages remain. No console errors.

---

---

## Session 2 — Per-question auto-reveal timer

_(This session resumed the project after the original chat history was lost; the AI first
re-read the whole repository to recover context, then the human chose the next feature.)_

### Human — feature request

> let's add a timer. before starting the game, the educator can specify a timer. for each
> question, once the timer expires, no new answers will be accepted and the correct answer
> will be revealed.

### AI — design decision (surfaced, human-approved direction)

The load-bearing question was *who enforces the timer*. A client-side countdown that reveals
when it hits zero would be unenforceable — a student could freeze their clock and keep
answering, and the projector/educator/phones would disagree on when time is up. So the timer
is **server-authoritative**, consistent with the rest of the app (the answer key never leaves
the server until reveal; control endpoints are localhost-only):

- The session owns a `timerSeconds` setting and, per drawn question, a wall-clock `deadline`.
- The `GameService` schedules a `setTimeout` that, when it fires, calls the **same** `reveal()`
  path a manual reveal uses — grade submissions, append CSV rows, broadcast the reveal. So an
  auto-reveal and a hand-reveal are byte-for-byte the same operation; answers lock identically.
- Manual reveal / skip / next / end all cancel the pending timer; skip/next re-arm it.
- `PublicGameState` gained `timerSeconds`, `questionEndsAt` (epoch ms), and `serverNow` (so
  clients correct for clock skew rather than trusting their own clock). The deadline is
  wall-clock only and never touches the RNG, so seed reproducibility is unaffected.

Clients are purely cosmetic: a shared `useCountdown` hook (mirrored in both apps, like the
existing `ContentView`) ticks a display off `questionEndsAt`, offset by the measured skew.
The educator sets the value in the control panel before/between questions (an `IonInput`,
0 = off); during a live question that row becomes the countdown. The student and projector
show a countdown bar above the question that turns red in the final 5 s.

New endpoints: `GET/POST /api/timer` (educator server only).

### AI — verification performed

- **Typecheck** of all workspaces green; both client bundles rebuilt.
- **Server flow via curl (authoritative):** set a 3 s timer, joined a student, started a
  question (state carried `timerSeconds: 3` and a `questionEndsAt` ≈ 3000 ms ahead of
  `serverNow`), submitted an answer while `answeredCount: 1`, then — with no further action —
  the server flipped to `phase: revealed, locked: true` on its own and **appended the graded
  row to the CSV**, proving auto-reveal grades exactly like a manual reveal.
- **Live browser run:** educator control shows the setter ("Auto-reveal timer 3 seconds"),
  and once a question starts, a ticking "27s → … until auto-reveal" countdown with the
  Skip / Reveal buttons; the student play view shows the countdown bar ("45s" + progress),
  and when the server's timer fired the student screen auto-locked and highlighted the correct
  option in green with "Answer revealed." — no educator click involved. No console or server
  errors on either app.

### AI — concern surfaced (AI domain), left for the human to decide

A **pre-existing** "Connecting…" `IonLoading` overlay sometimes fails to dismiss and lingers
on top of the (already-rendered) dashboard in the embedded webview. It is unrelated to the
timer — it reproduces in both apps and predates this change — and appears to be Ionic's
declarative `isOpen` dismiss behavior. Flagged for a separate fix; not touched here to keep
this change scoped to the timer.

---

## Session 3 — Educator UI polish

### Human — answer options as a 2×2 grid

> for the educator client, can we rearrange the answer options in a 2x2 grid?

**AI implementation:** the control column's option list was a vertical stack, which wasted the
column's width for the usual four options. Added an `.answer-grid` class
(`grid-template-columns: repeat(2, minmax(0, 1fr))`, single column below 480px) and swapped
the flex-column container for it; dropped the old per-option `maxWidth: 240` so each cell's
content fills its column. The `minmax(0, 1fr)` is load-bearing — it stops the wide server-SVG
option graphics from blowing out the tracks. Only the educator client changed (the student
options were already a responsive 2-up grid).

**Verified live:** text options (Near-zero / Small / Large / Very large) tile 2×2 each with its
vote bar, and the SVG-option variant (four density curves) also tiles cleanly with no overflow.
No console/server errors.

### Human — the drag-to-anonymize toggle

> the drag toggle for educators to anonymize the data is not the best experience.
> 1. can we pull the labels out of the slide track?
> 2. can we left align that cell? being right aligned causes to some bouncing

**AI (diagnosis + implementation):** both complaints had one root cause. The "Names"/"Hidden"
labels were absolutely positioned *inside* the track, and the whole toggle was pinned to the
right of a `space-between` row — so when its descriptive caption changed length (on toggle),
the right-anchored cell resized and the track jumped sideways ("bouncing").

- Pulled the labels out to **flank** the track (`Names [====] Hidden`), emphasizing whichever
  side is active; the emphasis follows the knob *live* during a drag.
- Moved the toggle onto its **own left-aligned line** below the stat, so the track's left edge
  is fixed by the panel padding and the changing caption now sits *below* it — it can no longer
  push the track horizontally. The drag-past-midpoint commit logic itself was left untouched.

**Verified live:** dragging the knob right flips to anonymized — track turns amber, "Hidden"
emphasizes, and the roster switches to "Student 1 / Student 2"; the track's left edge is
identical in both states (no bounce). No console errors.

### Human — split the summary panel into two columns

> let's split that panel into 2 columns: percentage and summary on the left, anonymity toggle
> on the right. for the left column, let's put the percentage as a large, center aligned
> number on its own with the other general statistics below it.

**AI implementation:** the top analytics panel became a two-column flex row (`.summary`): a
left `.summary-figure` with the accuracy as a large (3rem), centered number on its own line and
the "N answers · M students" line centered beneath it, and a right `.summary-toggle` holding
the anonymize control.

### Human — why aren't the columns symmetric? + responsive stacking

> wait, why don't they have the same flex value? they both should be 1 1 0%
>
> [then] ok let's make it responsive then. if the row is below a certain threshold where a true
> 50/50 split is not possible, render them as stacked columns

**AI (explanation + final design):** the first cut used `flex: 0 0 330px` on the toggle and a
fluid figure, because the toggle wraps a **fixed-width 220px drag track** (plus the Names/Hidden
labels) and so has a hard ~330px floor it can't shrink past. The human rightly pushed for a
symmetric declaration. The resolution: give **both** columns `flex: 1 1 330px`. Because the basis
is explicit (not `auto`), the width comes from the flex split rather than the caption's
max-content — so the bounce stays fixed — and the shared basis makes the layout self-responsive:
two 330px columns only fit side by side when the row is at least `2×330 + gap`, where they grow
equally to a **true 50/50**; below that, `flex-wrap` drops them to **stacked, full-width
columns**. The wrap threshold is exactly "the width at which an even split stops being possible,"
which is what the human asked for — no media/container query needed.

**Verified live + measured:** at a 1600px viewport the columns sit side by side at 50/50 (≈345px
each, filling the panel); at 1280px the summary content is ~547px (< the ~676px an even split
needs) so they stack full-width; and the track's left edge is stable across Names ↔ Hidden
(0.22px subpixel delta — no bounce). No console errors.

### Human — rearrange the control (questions) panel

> in a similar vein, let's refactor the questions panel. move the modules select dropdown to
> the same row as the open projector view link. split these 50/50. then, move the auto timer
> reveal control and matching seconds left to where the old modules select dropdown was

**AI implementation:** reshuffled the control column's header without touching any logic:

- The "Open projector view" link and the "Modules · N" button now share one 50/50 flex row
  (each `flex: 1`) above the panel.
- The panel's first row keeps the status text on the left and now hosts the **timer control**
  on the right, in the cell the Modules button vacated. It stays conditional: the compact
  setter (`⏱ Auto-reveal [n] sec/off`) before/between questions, and the live countdown
  (`⏱ Ns until auto-reveal`) during one — both right-aligned so the row reads as a status bar.
- The old standalone timer row was removed. The setter's label was shortened ("Auto-reveal"
  + "sec"/"off") to fit the half-width cell.

**Verified live + measured:** the 50/50 header renders (projector link | Modules); the panel
row shows status left and the timer setter/countdown right; starting a timed question swaps the
setter for the "42s until auto-reveal" countdown in place; and driving the relocated input
(type 20 → blur) committed to the server (`/api/timer` → `{seconds:20}`) and reflected in the
UI — so the move preserved the full commit path. No console errors.

---

## Session 4 — Startup: automatic port selection

### Human — don't crash on a busy port

> let's edit the startup scripts. it seems that if the exact ports for each client is already
> taken, the script crashes. can it intelligently select the next open port?

**AI (diagnosis + implementation):** the API called `server.listen(port)` with no `error`
handler, so a taken port raised an unhandled `EADDRINUSE` and killed the process; the
orchestrator then just timed out waiting for health. Fixed at the layer that already owns the
port numbers — the orchestrator:

- Added `findOpenPort(preferred, host, exclude)` (probes by briefly binding with `net`). Before
  spawning the API it resolves the student port from 4000 and the educator port from 4100,
  each probed on the host it actually binds (`0.0.0.0` / `127.0.0.1`) and kept distinct, then
  threads the resolved ports through the spawn env, health checks, ngrok `addr`, the
  `/api/link` post, and the printed URLs. It logs any shift (`port 4000 in use → using 4001`).
- Added a fail-fast: if the API child exits during startup, the orchestrator reports it and
  shuts down instead of waiting out the 20 s health timeout.
- Defensive net in `api/src/main.ts`: both servers now have an `error` handler that prints a
  clear `EADDRINUSE` message and exits 1 — covers the rare probe→bind race and running the API
  directly on a busy port.

**Verified live:** with an instance already holding 4000/4100, a second `yarn start` logged
"student port 4000 in use → using 4001" / "educator port 4100 in use → using 4101", came up
healthy on 4001/4101, and printed the shifted URLs — no crash (`lsof` confirmed all four ports
listening). With the ports free again, a fresh launch bound 4000/4100 normally with no shift
message. Typecheck green.

### Human — timer field should commit on blur, not on Enter

> the delay timer has poor ui. when entering a number, I have to press enter to have it
> changed. instead, make it change the setting on blur

**AI (diagnosis + fix):** two problems. (1) The commit ran in `onIonBlur` reading the
`timerText` state, and the reseed effect was keyed on `[state.timerSeconds, timerFocused]` —
so the instant blur flipped `timerFocused` to false, the effect re-ran and reset the field to
the *pre-commit* server value before the POST had echoed back, i.e. a flicker that made blur
look like it did nothing. (2) It leaned on a manual `onKeyDown` Enter→blur() to feel like it
committed. Rewritten to the idiomatic Ionic pattern: `onIonInput` updates the live text, and
**`onIonChange`** commits — in Ionic v8 that event fires precisely when the value is committed
(on blur and on Enter). The handler now takes `e.detail.value` directly (no stale-closure
risk), and the reseed effect is keyed on `[state.timerSeconds]` only, so a just-committed value
is never stomped. `onIonChange` also only fires on an actual change, so a focus/blur with no
edit no longer sends a redundant request.

**Verified live (real interaction):** with the field at 7, typed a new value and clicked away
— **no Enter** — and `/api/timer` committed to the typed value, the field held it with no
flicker. (Confirming this surfaced the pre-existing `IonLoading` "Connecting…" overlay again:
it sits on top and intercepts focus/clicks, which is what blocked driving the input until it
was dismissed — still worth fixing separately.) Typecheck green.

### Human — the stuck "Connecting…" loading overlay

> [propose ways you would fix it → chose imperative → then:] ok, it seems that an app wide
> loading indicator is still problematic. let's pivot and use inline indicators. just try to
> minimize how many of them there are

**AI (diagnosis):** probing the live DOM showed the `<IonLoading isOpen={loading}>` overlay
tore down unreliably — after `loading` cleared, the loading element hid but a stray
`ion-backdrop` (or the whole box) was left behind at z-index 40001 with `pointer-events: auto`,
swallowing clicks and focus over the rendered dashboard. Classic Ionic `isOpen`-overlay
mount/dismiss race, worsened by a near-instant localhost connect (loading flips true→false
within a render).

**First attempt (human's pick): imperative `useIonLoading`.** Presenting imperatively and
awaiting `present()` before dismissing fixed the clean-load case (overlay dismissed and stayed
gone). But a real *pointer* click still re-surfaced a stuck overlay — `useIonLoading` keeps a
reusable overlay element in the DOM, and a click re-showed it (`document.activeElement` became
`ION-LOADING`, `visibleOverlays: 1`, while the dashboard was still rendered). Programmatic
focus didn't trigger it; a synthesized mouse click did. So the overlay approach was flaky at
its root, not in one particular control mechanism.

**Human decision:** stop using an app-wide overlay entirely; use inline indicators, kept to a
minimum.

**AI implementation:** removed `IonLoading`/`useIonLoading` from both apps. Each now renders a
**single** inline indicator in its existing loading branch — a centered `IonSpinner` +
"Connecting…" (`.loading`) shown only while the first socket state loads, replaced by content
once connected. One per app (educator dashboard, student post-join), not the pre-overlay
sprawl of per-panel labels. No overlay element means nothing to get stuck or intercept input.

**Verified live:** after load both apps have **zero** `ion-loading`/`ion-backdrop` elements;
content renders; and the exact interaction that used to be swallowed — a real mouse click on
the timer field — now lands (`activeElement: INPUT`, `inTimerInput: true`). Typecheck + both
builds green.

### Human — refreshing after a reveal loses the correct answer

> if the student refreshes their client and the question's answer has already been revealed,
> it no longer displays the correct answer on their client side

**AI (diagnosis):** the reveal (which option is correct) is a **one-time** WebSocket push sent
at the moment the educator reveals. A client that connects or reconnects afterward only gets
its "hello" burst — `state` (phase `revealed`, locked) but no `reveal` — so on refresh it
showed a locked question with nothing marked. The answer key is server-side and never replayed.

**AI fix:** added `GameSession.currentReveal()` (returns the current question's `RevealInfo`
when `phase === "revealed"`, else null) and included it in the on-connect hello for both
`helloStudent()` and `helloEducator()`. So a fresh socket now receives `[state, reveal]`, and
since the client applies `state` first (reveal stays null) then the `reveal` message, the
highlight lands correctly. The educator dashboard gets the same benefit on refresh.

**Verified live:** with a question revealed, a brand-new WebSocket to `/ws` received
`["state","reveal"]` with the right `correctOptionId`; and reloading the student tab rendered
the revealed question with the correct option highlighted green and "Answer revealed." — where
before it showed a locked question with no answer. No console errors. (Note: the student's own
prior selection isn't restored — client-only state — so a refreshed student sees the correct
answer marked but not their earlier pick; flagged in case that's wanted later.)

### Human — spinner off-center on the "Waiting for the teacher…" screen

> on the student client when it is Waiting for the teacher…, the loading indicator (3 dots)
> is not centered

**AI (diagnosis + fix):** the waiting screen's `.center` container is a flex *column* with
`justify-content: center` (vertical) but the default `align-items: stretch`, and only had
`text-align: center`. Text-align centers the text inside the `IonText` block, but the
fixed-size `IonSpinner` is a flex item positioned on the cross axis by `align-items` — so it sat
at the left edge. Added `align-items: center` to that one container (inline, so the separate
`.center` used by the live-question view is untouched).

**Verified live:** on the waiting screen the spinner's center X now equals the viewport center X
(offset 0 px) — dead-centered above the text. No console errors.

### Human — prevent duplicate student names

The AI proposed four approaches (auto-disambiguate, reject/enforce-unique, educator-in-the-loop,
always-on identity tag) and recommended a blend. The human chose, for now, **option B — reject
duplicates** — with a plan to revisit after feedback.

> for now, let's implement B. I'll get some feedback and refactor this later on as needed

**AI implementation:** enforce case-insensitive name uniqueness at join.
- `GameSession.join()` now checks the entered name (already trimmed/space-collapsed by
  `checkName`) against every joined student case-insensitively and, on a collision, throws
  `HttpError(409, "That name is already taken", "name-taken")`. The check + insert live in the
  one method, so it's atomic. Dropped the old `duplicateName` return (a collision is now an
  error, not a soft flag).
- `HttpError` gained an optional `reason`, and `errorHandler` now forwards it, so the client can
  map a specific message instead of a generic failure.
- `JoinView` shows "That name's already taken — please choose a different one." on the
  `name-taken` reason and keeps the student on the join screen to pick another; removed the old
  "someone already joined with that name" soft toast.

**Verified live:** via the API, `Alex` joins (200) while `alex` and `  ALEX  ` are rejected
(409 `name-taken`) and `Bob` succeeds — so matching is case-insensitive and whitespace-normalized;
in the UI, submitting a taken name shows the toast and stays on the join screen. Typecheck + build
green, no console errors.

_Note left open (per the human's "refactor later"): names are unique among everyone who has
joined this session, and there is no student-removal yet, so a name stays reserved even after
someone leaves; determined collisions are still trivially bypassable ("Alexx"). Revisit with the
disambiguation/educator-control ideas when feedback comes in._

### Human — logout buttons (student + educator)

> now for both clients, let's include a logout button on the top right. for students, it will
> release their token and username. for educators, it will end the current game (writing
> anything needed to the filesystem), logout all students, and reset

**AI implementation.**

*Student logout* — a header button (top-right) that clears the sessionStorage token/name,
returns to the join screen, and fire-and-forget POSTs `/api/leave` so the server drops them:
`GameSession.removeStudent()` deletes the roster entry + any pending answer (freeing the name
for reuse and invalidating the token); already-graded events stay (the CSV is the durable
record). The educator's roster/analytics refresh over the socket.

*Educator logout* — a header button that opens a confirm dialog (`IonAlert`; user-triggered, so
not exposed to the `IonLoading` overlay flakiness), then calls `/api/reset`:
`GameService.reset()` finalizes the outgoing game (clears the timer, marks `endedAt`, writes its
manifest — CSV was already written incrementally), broadcasts a new `{ type: "reset" }` WS
message to the student hub, then swaps in a **fresh session + writer** and broadcasts the new
lobby state + empty analytics. To support the swap, `GameService` now holds a mutable
`session`/`writer` built by a `newSession()` factory (injected from `main.ts`): the first game
uses the configured id/seed; each reset mints a new id (→ new CSV/manifest) and seed, so every
game is its own record. Students receive `reset` and reuse the existing `SESSION_INVALID_EVENT`
path to return to the join screen. New WS type `{ type: "reset" }`; new endpoints `/api/leave`
(student) and `/api/reset` (educator).

**Verified live:**
- Student `/leave`: `Alex` joins → second `Alex` 409 → Alex leaves → `Alex` joins again 200
  (name freed). UI: clicking the header logout returns to the join screen and clears storage.
- Educator `/reset`: from a revealed Q1 with 2 students, reset produced a **new** session id
  (lobby, 0 questions, 0 students, timer 0); the old `*.meta.json` gained an `endedAt` and kept
  its CSV rows, a fresh CSV/manifest appeared for the new session. UI: the top-right button
  opens the confirm dialog and "End & reset" returns the dashboard to a clean lobby.
- A connected student socket received `["state","reset","state"]` on reset (`gotReset: true`),
  i.e. it's kicked back to join. No console errors; typecheck + builds green.

### Human — student count should reflect real presence (leave / tab-close / disconnect)

> the educator client has a total number of students in the lobby. is that updated regularly?
> it should reflect if a student logs out but also if they close the tab or they lose network
> connection. it's ok if there's a reasonable lag in updating, like 5 seconds

**AI (approach):** the roster only shrank on explicit logout/reset. The WS hub was one-way
(server → client), so students were anonymous to it and a closed tab / dropped network left a
stale roster entry. Rather than build socket-liveness tracking (protocol ping/pong + per-socket
token association + grace timers), used a simpler, uniform **heartbeat + sweep** that covers all
three cases the same way:

- **Client:** `useGameSocket(token)` sends a `{ type: "heartbeat", token }` over its existing
  socket on connect and every 2 s (and immediately when a token first appears after joining).
- **Server:** the student hub forwards each heartbeat to `GameService.markSeen(token)`
  (`lastSeen[token] = now`; join also seeds it). A 2 s sweep drops any roster student whose last
  heartbeat is older than `PRESENCE_TIMEOUT_MS = 5 s`, then broadcasts fresh state/analytics. So
  a student who logs out, closes the tab, or loses the network stops heartbeating and is removed
  within ~5–7 s — the "reasonable lag" the human allowed. New `ClientMessage` variant
  `heartbeat`; `Hub` gained an `onHeartbeat` callback (student hub only).

**Verified live:** a simulated client that joined and heartbeated held `studentCount = 1`
through t=0→4 s, then (heartbeats stopped) dropped to 0 by ~t=10 s (≈6 s after the last beat);
the **real** app kept a student at `studentCount = 1` across 9 s (past the 5 s timeout), so live
students are never wrongly evicted; and navigating a joined tab away cleared the roster (educator
shows "0 students / No one has joined yet"). No server or console errors; typecheck + builds green.

### Human — roster count and analytics roster disagree on join

> a student is waiting … the teacher dashboard shows Lobby · 0/1 answered … but the analytics
> panel shows "No one has joined yet."

**AI (diagnosis + fix):** the two panels read different data. The control panel's "0/1" comes
from the broadcast `state` (`studentCount`), which `join()` did update; the analytics
"Students" list comes from the `analytics` snapshot, and `join()` broadcast `state` but **not**
`analytics`. So an educator already connected when a student joined kept its pre-join (empty)
analytics snapshot. The roster list is built from the live student map, so the fix was simply to
`broadcastAnalytics()` on join too (leave/reveal/sweep already did).

**Verified live:** with the educator connected first, a student joining flipped the analytics
panel from "No one has joined yet" to "0 answers · 1 students" with the name in the roster,
matching the control panel's "0/1". No console errors.

### Human — sort the analytics roster alphabetically

> the students analytics panel … should be alphabetical by student name

**AI:** the `analytics()` roster was sorted by accuracy (descending, a leaderboard). Changed the
sort to `a.name.localeCompare(b.name, undefined, { sensitivity: "base" })` — case-insensitive
alphabetical. (Server-side, so it's the single source of truth for every consumer of the list.)

**Verified live:** students joined as Zoe, alice, Mona, Bob, charlie came back as
`[alice, Bob, charlie, Mona, Zoe]`; in the UI, joining Diego/Ana/Yusuf/Mei rendered as
Ana → Diego → Mei → Yusuf. No console errors.

_Note: when the anonymize toggle is on, names become "Student N" (N is stable, keyed on token),
but the rows stay in real-name alphabetical order — so the numbers can read non-sequentially.
Left as-is since the request was about the named view; can sort the anonymized view by number
instead if preferred._

### Human — join input: random writer placeholder + validate on blur

> pick the placeholder name randomly from a list of popular writers and poets.
> it validates as the user types. instead, swap it to validate on blur

**AI implementation (JoinView):**
- Added a list of ~18 writers/poets; the name field's placeholder is `e.g. <random one>`, picked
  once per visit via `useState(randomPlaceholder)` (a fresh name on each mount / re-join).
- Switched React Hook Form from `mode: "onChange"` to `mode: "onBlur"`, so the inline error only
  appears when the field loses focus (the `Controller` already forwards `onIonBlur`→`field.onBlur`).
- Decoupled the submit button from `formState.isValid` (now `disabled={mutation.isPending}` only).
  With on-blur mode, gating the button on `isValid` would need a click-to-blur then a second click
  to submit; `handleSubmit` still validates on submit, so invalid names are blocked there with the
  message shown.

**Verified live:** placeholder showed "e.g. Mark Twain", then "e.g. Oscar Wilde" after reload
(randomizes); typing a too-short name showed **no** error until blur, when "That name is too
short." appeared; a clean valid name ("Jordan Rivers") submitted in one click and joined; and an
invalid submit was blocked with its error (incidentally re-confirming the known profanity
over-match — "Charles Di**ck**ens" trips the filter). No console errors; typecheck + build green.

### Human — tighten the student client + enrich the projector view

> student: remove the QR on the login page; the app doesn't fit on an iPhone 13 (vertical
> scroll); add a privacy-policy link that opens a modal (short — we reserve the right to record
> progress (right/wrong) and share with instructional staff).
> educator projector: keep the QR but also show the question, options, and any timer (a
> non-interactive reference; reveal shows there too); remove "Open this on the projector…".

**AI implementation.**

*Student — JoinView:* removed the join QR (and its `getJoinQr` query). Added a "Privacy policy"
link that opens an `IonModal` with a two-sentence policy ("While you play, we reserve the right
to record your progress — which questions you answer correctly and incorrectly — and to share it
with the instructional staff for this class. Your name is used only to label that progress …").

*Student — fit on iPhone 13:* the culprit was `.options` collapsing to a **single column** under
480px (four stacked 96px options overflowed). Kept it a **2×2 grid at all widths**
(`repeat(2, minmax(0, 1fr))`), trimmed option `min-height` 96→84 and font 1.05→1rem, and reduced
`.center` padding 24→16 / gap 16→14.

*Educator — ProjectorView:* now subscribes to the game socket and renders the live question as a
**read-only reference** — prompt, the options in a 2×2 grid (labeled "Option N", no vote bars /
not clickable), the countdown, and the correct-option highlight on reveal — above the kept
join-link/QR panel. Removed the "Open this on the projector. Its join screen shows the same QR…"
line (and the now-inaccurate "(for the projector)" button suffix).

**Verified live (390×844 iPhone 13 viewport + desktop):**
- Join screen: no QR, "Privacy policy" link present, modal opens with the short text.
- A graphical question (the tallest case: SVG prompt + four options) measured `overflowPx: 0` —
  fits with no vertical scroll; options render 2×2.
- Projector: shows the SVG-prompt question with options; reveal highlighted "Option 3" green;
  a timed question showed "57s until the answer is revealed". No console errors; typecheck + builds green.

### Human — remove the projector's "Open student app" button

> remove the "open student app" button on the projector view

**AI:** dropped the button (and its now-unused `openOutline` import) from the ProjectorView join
panel. The QR and the join URL remain. Verified with a stubbed tunnel URL: the panel shows the QR
+ link and no button; typecheck + build green.

### Human — embed the questions in the session record (anticipating non-deterministic modules)

> improve session recording — future modules' generation may be less deterministic, and for
> ease of use, embed the questions in the meta.json sidecar. This is hard for image/graph
> questions. Propose solutions.

**AI proposed** a baseline (embed each revealed question's structured essentials + the **correct
answer**, which nothing recorded before) and three ways to handle graphics: inline the SVG, a
compact re-renderable module "spec", or **sidecar asset files**. **Human chose:** sidecar files;
embed `questions[]` in `meta.json` with the heavy data written on reveal/end; record
**revealed** questions only.

**AI implementation:**
- New shared types `RecordedContent` / `RecordedQuestion`; `SessionManifest` gained
  `questions: RecordedQuestion[]`.
- `SessionWriter.recordQuestion(public, key)` externalizes graphics: each `svg` (and any
  `data:` image/audio) is written to a sidecar file under `sessions/<session>/` and referenced
  by `path`; text and the correct answer stay inline. The assets dir is created lazily.
- On **reveal**, `GameService` records the just-revealed question (with its `AnswerKey`) into the
  session; `manifest()` includes the growing `questions[]`. Only refs live in the JSON, so it
  stays small and the heavy files are written once per question. `APP_VERSION` → 0.4.0.

**Verified live:** revealed a mix of graphical (SVG prompt + text options) and numerical (text
prompt + SVG options) questions. The manifest recorded 9/9 revealed questions — graphical prompts
and numerical options as `{kind:"svg", path:"<session>/…svg"}`, text inline, and the correct
`{format, correctOptionId}` on each. 30 sidecar `.svg` files written = 30 refs in the manifest;
the manifest held **0** inline `<svg>` and stayed ~11 KB. Typecheck + builds green.

### Human — a CS-jargon vocabulary module (procedural, generated on the fly)

The human shared a technical-recruiter question bank and wanted a module to help students use
CS jargon intentionally and confidently. The AI proposed turning it into modules and — when the
human asked whether it could be non-deterministic / "generated on the fly, not pulled from
pre-generated values" — clarified that the existing modules already generate on the fly
*deterministically*, and that the same could be done for jargon via **procedural assembly** from
fact-atoms (vs. an LLM). The human chose: **one module per domain**, sub-skills
term→definition / discriminate / red-flag / analogy, and **procedural assembly**.

**AI implementation (`shared/src/modules/vocab.ts`):** four selectable modules — Dev, QA, IT,
Security vocabulary — sharing one generator. Each domain has a bank of *fact-atoms*
(`term, definition, misconception?, analogy?, contrast?`) curated from the recruiter doc (strong
answers → definitions, red flags → misconceptions, "difference between X and Y" → contrasts,
examples → analogies). The generator assembles a fresh multiple-choice question off the seeded
RNG: template × term × procedural distractors × shuffle. Nothing is a pre-written question, yet
it's deterministic and **correct-by-construction** — every distractor is some *other* term's real
fact, so there's exactly one right answer. Four sub-skills tagged on `skill`
(Definitions / Distinctions / Red flags / Analogies). Text-only, so it renders in the existing
2×2 grid and records inline. `APP_VERSION` → 0.5.0.

**Verified:** generated 2,400 questions across the four modules — **0 invalid** (always 4 options,
exactly one correct, no duplicate option text, `grade()` sane), all four sub-skills evenly
represented; samples read well ("Which describes Stack, but not Queue?" → LIFO, trap FIFO; red-flag
puts the misconception beside the real definition). Live: the four modules appear in the picker, a
"Which describes Array, but not List?" question rendered on the student as a 2×2 text grid, reveal
highlighted the correct option, and it recorded fully inline in the manifest. Typecheck green.

### Human — split the vocabulary modules by difficulty (beginner / advanced)

> can we split the modules by difficulty level? maybe just beginner and advanced?

**AI (design + implementation):** the only fork was module count — with no per-module difficulty
control in the UI, the level has to *be* a module. Human chose **domain × level = 8 modules**.
Each fact-atom gained a `level`; a domain's Beginner/Advanced modules are built by one factory.

Key design choice: a module's **subject** terms (what a question is *about*) come from its level,
but **distractors and pair-partners** are drawn from the whole domain bank. So an Advanced module
can still ask "which describes SSO, not MFA?" even though MFA is a Beginner term — MFA just never
becomes a question subject there. This keeps every module rich (all four sub-skills stay feasible
even when a confusable pair straddles levels) and makes Advanced modules skew naturally toward
Distinctions and Red flags, since the specialized terms carry the pairs and nuance.

**Verified:** 4,000 questions across the eight modules — **0 invalid** and **0 wrong-level** (each
module only asks about its own level's terms, checked by parsing the subject out of every prompt);
all four sub-skills present where feasible (advanced security has no analogy term, so it correctly
generates only Definitions/Distinctions/Red flags). Live: all ten modules (2 stats + 8 vocab)
appear in the picker with clean short titles ("Dev · Beg", "Dev · Adv", …), and advanced samples
read well. Typecheck green.

### Human — default to no modules, and block starting without one

> let's load 0 modules by default and prevent the game from starting without any modules

**AI implementation:** the module pool defaulted to *all* modules (and `drawQuestion` fell back
to all modules if the pool was empty). Now:
- `GameSession.modulePool` defaults to `[]`.
- `drawQuestion` no longer falls back — with no pool and no explicit module it throws
  `HttpError(409, "Select at least one module before starting.")`. `nextQuestion` was reordered to
  draw *before* incrementing the question count, so a blocked start leaves the session untouched
  (still lobby, Q0).
- Educator control panel: Start / Next / Skip are disabled while zero modules are selected, with a
  "Select at least one module to start." hint under the buttons.

**Verified live:** a fresh session shows "Modules · 0" with Start disabled + the hint; `POST /next`
with an empty pool returns 409 and leaves the state at lobby/Q0 (counter not bumped); selecting a
module re-enables Start and starting then works. No console errors; typecheck + build green.

### Human — relicense from MIT to noncommercial

The human asked whether MIT prevents commercial use; the AI clarified that MIT is permissive and
explicitly allows commercial use (and selling), and laid out source-available alternatives. The
human chose **PolyForm Noncommercial 1.0.0**.

**AI:** replaced `LICENSE` with the canonical PolyForm Noncommercial 1.0.0 text (fetched from the
project's repo) plus a `Required Notice:` copyright line; set `license` to
`PolyForm-Noncommercial-1.0.0` in every workspace `package.json`; and dropped the "open-source"
wording from the README/description (a noncommercial license is source-available, not OSI
open-source), replacing the License section accordingly. The original "open source" phrasing in the
Session 1 prompt was left untouched — that block is a verbatim record of what was said.

**Note surfaced:** relicensing is not retroactive — the commits already pushed under MIT remain
available under MIT; this governs future versions only. (Not legal advice.)

### Human — issue #1: answer selection lost when switching tabs

A student (samnramos) filed [issue #1](https://github.com/jonathan-chin/edugame/issues/1): tapping
an answer, switching to "My progress", and back loses the selection. The AI confirmed it's real:
the app renders `tab === "play" ? <PlayView/> : <ProgressView/>`, so switching **unmounts**
PlayView, and the pick lived only in PlayView's local `selected` state → gone on remount. (The
answer itself is fine — it POSTs to the server on tap; only the client's visual memory was lost.)
Human chose **Option A** (client-only lift).

**AI implementation:** moved `selected` up to `App` (which stays mounted across tab switches),
resetting it on `state.question?.id` change; `PlayView` now takes `selected` + `onSelect` props.

**Verified live:** tapped an option → switched to My progress (confirmed PlayView unmounts) → back;
the selection and "Answer saved" caption persisted; a new question (skip) cleared it. No console
errors. (Note: this is client-only, so a full page refresh still won't restore the pick — Option B,
a `GET /api/answer` server round-trip, would; deferred. It also does not add a per-question history —
that's a separate, feasible feature since the server already stores each student's graded events.)

### Human — current-session question history for students

Following on from issue #1, the human asked for a per-student history of questions and whether they
got each one right, first for "the same phone across multiple days", then — after the AI showed that
cross-day identity is blocked by ngrok's changing public URL (localStorage is per-origin) and by the
session-scoped token — narrowed it to **the current session only**.

Design decisions the human made along the way:
- **Graphics:** the AI proposed caching each question's content on the client, since the student
  already receives server-rendered SVG inline over the socket, so replaying a chart costs no extra
  transfer. The human noted this wouldn't generalize to PNG/audio/video; agreed — those are `src`
  URLs and are re-fetched (and HTTP-cached) rather than stored.
- **Row loading:** the human rejected tap-to-expand in favour of **infinite scroll** — "render each
  row fully but only load X number at a time".
- **Row content:** "only show their answer and the correct answer (if different), as a 2 column row.
  however, still track all the other options just in case."

**AI implementation:** `StudentProgress` gained `history[]` (`shared/src/state.ts`), built in
`GameSession.progress()` by joining the student's graded events with the questions recorded at
reveal time — text only, including every option offered even though the row renders at most two.
The student client caches each question's renderable content in `localStorage`, keyed by session id
and dropped when the session changes, so a row can re-render the real chart; the server's text is
the fallback on a cache miss. Rows are newest-first, 8 at a time.

**Note surfaced:** `IonInfiniteScroll` silently never fires here — it only attaches its scroll
listener when it is a direct child of `ion-content`, and this view renders inside a wrapper. Replaced
with a sentinel plus a plain scroll listener on the content's scroll element, which also re-checks on
attach so a short list keeps loading until the screen is full.

**Verified live:** a wrong answer renders the 2-column your-answer/correct-answer comparison, a
correct one collapses to a single green column; a chart question re-renders its SVG from the cache
and survives a full page refresh; with 12 answered questions the list starts at 8 and reaches 12 on
scroll, then stops and drops the trailing spinner. Typecheck + build green.

### Human — a locked phone was evicting students mid-game

The human reported that a student's phone auto-locking invalidated their token, and asked whether it
was related to the backgrounded-tab note from the history work. It was — same root cause, with a
worse consequence than a re-login.

**Chain:** phone locks -> the mobile browser suspends timers and drops the WebSocket -> heartbeats
stop -> after **5 seconds** `sweepAbsentStudents` called `removeStudent(token)`. Reconnecting could
not repair it, because `markSeen` is guarded by `hasStudent(token)` — now false, so the resumed
heartbeat was discarded and the next request 401'd them to the join screen. Worse, `removeStudent`
also drops `currentAnswers`, so a student who answered and *then* locked their phone had that answer
silently discarded: ungraded, missing from "N/M answered", absent from the CSV.

The design fault was one timeout doing two jobs: "is this screen on right now" (fine at 5s) and "is
this person still in the class" (not fine at 5s).

**AI implementation (server):** the sweep no longer removes anyone — it only pushes a fresh state
when the connected count moves. `lastSeen` is now purely connection state; `GameService.state()`
decorates the session's public state with `studentCount` = *connected* students, and every state read
goes through it. Enrolment now ends only on an explicit logout (`leave`) or an educator `reset`.

**Tradeoff accepted:** a student who closes their tab and walks away stays on the analytics roster
until the educator resets. Chosen deliberately — a stale name in the roster costs nothing, while an
evicted student loses their answer mid-question.

**AI implementation (client):** the human then asked to fix the storage half. The token lived in
`sessionStorage`, which dies with the tab — and iOS may discard a backgrounded tab outright, so a
locked phone could still return to a join screen even with the server fixed. Moved the token/name to
`localStorage` (`student/src/lib/identity.ts`), stamped with the game session id: the first state
naming a different session clears the identity and starts a fresh join, so a token can never leak
into the next class.

**Verified live:** a student who went quiet for 9s (well past the 5s timeout) kept a valid token
(HTTP 200, previously 401), kept her submitted answer (`answeredCount` stayed 1), and was graded
normally on reveal — while `studentCount` excluded her and the roster still listed her. A brand-new
tab picked up the stored identity and rejoined the game in progress (the `sessionStorage` case that
used to fail). A *valid* token stamped with a stale session id was cleared on load and sent to the
join screen, isolating the mismatch guard from the 401 path. Typecheck + build green.

**Note surfaced:** shutting down the API process still invalidates every token — both servers share
one in-memory `GameService`, and a restart mints a new session id, so the roster, unrevealed answers
and every student's history are lost (revealed rows and the manifest survive on disk). The human
confirmed this is intended behaviour for now; persisting and rehydrating the roster would be a
separate piece of work.

_Subsequent sessions are appended below as work proceeds._

### Human — course vocabulary modules from the bootcamp slides (Week 1 pilot)

The human asked how to turn the Marp slide decks in `jonathan-chin/citytech-ttpr-2026-summer`
into question modules — vocabulary based, one per week — and chose to pilot Week 1 before
committing to all seven.

**What the AI found in the source:** 28 decks, Mon–Thu across 7 weeks. The week theme is in each
deck's `footer:` frontmatter and the day's topic in `description:`, so the module boundaries fall
out of the files. Two patterns turned out to be unusually valuable: ~38 `X vs. Y` slide titles map
straight onto the existing `contrast` field (which drives the hardest question type), and 63
"Follow Up:" slides mark concepts that needed re-teaching — a precise record of where the class got
confused, which is what the `misconception` field wants.

**The catch, surfaced before any code:** the 380 `- **Term**: definition` bullets are not 380
vocabulary atoms. Roughly half are install instructions, link lists, or "Term: value" mappings, and
many genuine definitions are written to be read *beside their slide title* rather than standing
alone — which an answer option must do. So this is a curation job that a script accelerates, not a
parser. The AI recommended against generating questions from markdown at runtime.

**AI implementation:** `scripts/extract-course-vocab.mjs` drafts candidates from a week's decks
(four patterns, each with provenance) and prints them for review; `shared/src/modules/course-vocab.ts`
holds the curated Week 1 bank — 30 atoms, all with definitions, plus 14 misconceptions, 7 analogies
and 22 contrast pairs. It reuses the existing `generateVocab` wholesale: `VocabAtom` and
`makeVocabModule` are now exported, and `level` became optional since weekly modules don't split by
difficulty. One bank per week is deliberate — distractors are drawn from the same bank, so a Week 1
question offers other git and shell answers rather than something from Data Visualization.

**Design note surfaced for review:** red-flag questions inherited the interview-prep phrasing ("A
recruiter asks you about Merge conflict…"), which fits `git` but not `Blocker` or `Merge conflict`.
Added an optional `redflagPrompt` to `VocabOptions` — the default is unchanged, and the course
modules ask "Which of these is a common misconception about X?" instead. One word reverts it.

**Verified live:** the module appears in the educator picker as "Week 1 · Environment Setup and
Developer Foundations"; drawing six questions through the real API produced all four sub-skills with
correct keys and same-topic distractors ("Which describes Clone, but not Fork?" traps with Fork's own
distinguishing phrase). A bank check confirmed no dangling `contrast.with` targets and no duplicate
terms — a dangling target fails silently, dropping that term from Distinctions rather than erroring.
Typecheck + build green across all workspaces.

**Open:** analogies are the thin spot — Week 1's decks contain exactly one ELI5 slide, so the three
git-integration analogies are the course's own and the remaining four were authored to match its
voice. Weeks 2–7 await the human's read on atom quality.

### Human — scaling the course vocabulary modules to all seven weeks

After reviewing the Week 1 pilot the human said to drop analogies for now and scale to every week.

**AI approach:** the six remaining weeks are independent, so they were curated in parallel — one
agent per week, each reading its four decks in full against a shared spec (self-contained
definitions, mutual `contrast` pairs whose partner exists in the same bank, misconceptions phrased
as flat assertions a student would actually say, no analogies, faithful to the slides). Every
returned bank was then validated centrally rather than trusted.

**Result:** 215 atoms across 7 modules — 149 misconceptions and 153 contrast fields. Weeks 2–7
carry no analogies, so those modules generate three sub-skills instead of four; `generateVocab`
only offers a question type its bank can support, so this needed no special-casing.

**Guardrail added first:** a dangling `contrast.with` is silent — the generator skips the atom and
the module quietly loses Distinctions. Before multiplying one bank into seven, `makeVocabModule`
now calls `validateVocabBank`, which throws at import on a dangling reference, a duplicate term, or
a missing definition. Verified it catches all three and passes valid banks.

**Defect found and fixed while sampling:** in a Distinctions question, distractors drawn from atoms
with no `contrast` fell back to their full definition, making those options visibly longer. Measured
over 394 generated questions: the correct answer was the longest option only **8%** of the time
against a 25% baseline, so "ignore the long one" reliably eliminated a wrong answer. The generator
now prefers other atoms' `thisIs` phrases and only falls back when a bank has too few. After: 21%,
and the within-question length spread dropped from 46 to 16 characters. This improves the existing
recruiter vocabulary modules too.

**Verified live:** 2,100 generated questions across the seven modules — every one with four distinct
options, a resolvable key, and no empty text. All seven appear in the educator picker; a mixed pool
of Weeks 2/4/6/7 draws correctly from each. Typecheck + build green.

**Notes surfaced:** ten terms are taught in more than one week. Most are consistent restatements
(Component, Props, Library, Framework, Node.js, URL parameter, Dirty/Clean data) and are harmless —
distractors never cross bank boundaries. But **Absolute path** and **Relative path** mean *filesystem*
paths in Week 1 and *import* paths in Week 2. Both match their own slides, so the atoms were left
alone and annotated in place rather than renamed. The per-week agents also flagged individual
judgement calls worth an instructor's eye — Week 3's `PUT` rests on a single parenthetical, Week 2's
`main`/`master` pair distinguishes only on provenance, and Week 5's Ionic is called both a library
and a framework on the same slide.

### Human — trimming the course modules after review

Reviewing the seven-week set, the human made three calls:

- **Filesystem vs import paths**: "similar enough to not have to make a distinction." The Week 1 /
  Week 2 overlap on `Absolute path` / `Relative path` stands as-is; the in-place annotation warning
  about the two senses was removed rather than left implying a problem.
- **Removed `PUT` and `Ionic`** as too ambiguous to ask about — the decks teach `PUT` only in a
  single parenthetical, and call Ionic both a library and a framework on one slide.
- **Removed the Week 1 analogies** for consistency, since Weeks 2–7 have none.

**AI implementation:** dropping a term is not a one-line delete — `PATCH` contrasted with `PUT` and
`Capacitor` with `Ionic`, so both would have become dangling references. The `validateVocabBank`
guardrail added earlier exists for exactly this: it throws at import rather than silently dropping
those atoms from Distinctions. Both partner atoms were kept with their contrast fields removed, so
`PATCH` and `Capacitor` still generate definition and misconception questions.

**Verified live:** 213 atoms across 7 modules (148 misconceptions, 149 contrasts, zero analogies);
all seven now generate exactly three sub-skills, with Week 1 no longer producing Analogies. 2,100
generated questions, no defects. 1,600 prompts confirmed neither `PUT` nor `Ionic` is ever a
question subject — `Ionic` still appears inside `Capacitor`'s definition as prose context, which is
intended. Typecheck + build green.

### Human — restore Ionic without the library/framework question

The human clarified the original intent: keep `Ionic` as a term, just never ask whether it is a
library or a framework.

**AI implementation:** re-added `Ionic` defined as "the toolkit used to build hybrid apps…" — no
classification either way — and restored the mutual `Ionic`/`Capacitor` contrast, which draws the
line the decks *are* clear about: shared UI components vs. access to native device features.

**Second-order problem found by checking, not by assuming:** Week 5 still held its own `Library` and
`Framework` atoms, and their phrases were landing as distractors inside Ionic questions. In 18% of
Ionic draws, an option like "Code you call when you want it, and can swap out" appeared next to
"Which describes Ionic, but not Capacitor?" — which is *arguable* rather than wrong, since the decks
call Ionic both. That is precisely the question the human asked not to ask, reintroduced sideways.

Removed `Library` and `Framework` from Week 5 only. Week 2 carries the pair with its contrast and
misconception intact, and has no Ionic in the bank to collide with, so nothing is lost from the
course's coverage. Re-measured: 0% of 160 Ionic questions now include a library/framework option.

**Verified live:** 212 atoms across 7 modules (147 misconceptions, 149 contrasts, 0 analogies);
2,100 generated questions with no defects; 2,800 prompts confirm `PUT` is never a subject.
Typecheck + build green.

### Human — three open items closed

The human closed out the standing caveats the AI had been repeating at the end of each report:

- **Restarting the API drops the roster, unrevealed answers and every student's history** — ruled
  *intended behavior*, not a defect. Both servers share one in-memory `GameService` and a restart
  mints a new session id; revealed rows and the manifest still survive on disk. Not to be raised
  again unless a future request (offline support, say) genuinely reopens it.
- **Cross-day student history** — dropped from consideration. It was blocked by ngrok's changing
  public URL, since browser storage is per-origin.
- **The analogies sub-skill** — dropped from consideration. The slides are too thin on analogies to
  curate rather than author, so all seven weekly modules generate three sub-skills by design.

**Note surfaced (AI, about its own conduct):** the AI had been restating these as "still open" at the
end of successive reports. Decided items should be treated as closed — repeating them reads as not
having listened, and buries the findings that do need attention.

### Human — the module picker should save on any dismissal

The human reported that ticking modules and dismissing the picker by clicking outside discarded the
changes, and asked to connect the commit to `onDismiss` in general rather than only the Done button.

**AI implementation:** commit moved into `onDidDismiss`, which fires however the modal was closed —
backdrop, Escape, or Done flipping the parent's open state. Done therefore only closes, so there is
a single commit path and no double POST. The draft is read through a ref: `onDidDismiss` binds its
handler when the modal mounts, so reading `draft` from that closure yields the value as of that
render — empty — and every tick would be silently dropped.

**Follow-up from the human:** dismissing with zero modules selected should also save, with the
"Start game" button left to do the gating. That required a server change as well — `setModulePool`
was rejecting an empty list with a 400, so clearing every module would have failed with an error
rather than saving. Enforcement now lives in one place: `drawQuestion` still returns 409 "Select at
least one module before starting.", mirrored by the already-disabled Start button. An empty pool is
a legitimate state to leave the picker in.

**Second follow-up:** a "Clear" button in the toolbar, aligned left. It clears the draft only, so it
behaves like any other tick and lands when the modal closes.

**Verified live:** Clear with three modules selected empties the draft, self-disables, and leaves the
committed pool untouched; closing afterwards commits the empty pool and disables "Start game" with
its hint. Ticking and dismissing without pressing Done saves the selection. Server-side, POSTing an
empty pool now returns 200 (was 400) while starting a question with one still returns 409. Typecheck
+ build green.

**Note on the AI's own verification:** an early `curl` immediately after closing the modal still
showed the previous pool and was nearly reported as a failure — it was racing the in-flight POST.
The settled read was correct. Worth remembering that a read taken straight after a UI action can
beat the request it is meant to observe.

### Human — questions can carry zero or more skills

Reviewing the reports, the human noticed a question card renders a single skill and asked to
refactor so a question can have **0+ skills** (confirming: one and only one module, but any number
of skills). Until now `skill` was a single string end to end.

**AI implementation (cross-cutting):** `skill: string` became `skills: string[]` on
`QuestionInstance`, `RecordedQuestion`, `AnswerEventRow`, and `StudentHistoryItem`. The CSV `skill`
column became `skills`, serialized pipe-joined (`Definitions|Distinctions`) with a `parseSkillsCell`
helper — and because the report reads columns positionally, pre-refactor CSVs still parse (a lone
skill becomes a one-element array). Every skill aggregation (api analytics + student progress, and
the report's by-skill) now iterates each answer's skills, counting once per distinct skill, so a
two-skill question counts toward both and a skill-less one toward none. Generators emit
single-element arrays; the model supports more.

**Verified live:** a synthetic two-skill question counted toward both skills (each 1/3) and rendered
both pills; a zero-skill question produced no skill bucket and no pills. Full monorepo typecheck +
build green. The example session was regenerated in the new format.

**Consequence surfaced:** per-skill totals can now exceed the answer total (a multi-skill answer is
counted under each of its skills), so "By skill" describes skill-level performance, not a partition
of the answers.

### Human — difficulty flagged for a future revisit (TODO.md)

Asked how "By difficulty" is determined, the AI traced it: `difficulty` is a constant hard-coded per
question *type* in each generator (vocab Definitions→1, Distinctions→3, etc.), not anything measured.
So for the vocabulary modules it merely restates the skill, making the reports' "By difficulty"
duplicate "By skill". The human chose to keep the system but flag it. Created `TODO.md` (a new
short-list of shipped-as-is items, complementary to this narrative log) with the difficulty entry
and revisit options, plus an inline `TODO(difficulty)` at the `DIFFICULTY` map in `vocab.ts`.

### Human — a report generation system (CLI + PDFs)

The human asked for a command-line, Node-based report generator in the monorepo: read the recorded
`sessions/`, and produce **PDF** summaries — a whole-class report plus one per student — most
aggregated first, drilling down to individual questions recreated from the meta sidecar. PDFs are
gitignored so student names (PII) never reach git. Several open questions were worked through before
building; the decisions:

- **Filenames:** `YYYY-MM-DDTHHMM_YYYY-MM-DDTHHMM_studentName.pdf` (ISO-shaped, no illegal colon);
  the second datetime is dropped for a single session, the name for the class report.
- **Nicknames:** one sidecar per session (`<id>.names.json`), auto-generated identity-by-default
  (title-cased), human-editable. Per-session files sidestep the "same nickname, two students,
  different sessions" collision without any token plumbing.
- **Media:** SVG-only for now, inlined; the media path is abstracted so PNG/audio/video is additive.
- **Dashboard:** deferred (a self-contained bundle was scoped but not built).
- **PDF engine:** Puppeteer, rendering one HTML layout, with a **system-Chrome fallback** — the
  bundled-Chromium download is exactly what a locked-down (e.g. university) network blocks, and the
  fallback renders off installed Chrome.

**AI implementation:** a new `@edugame/reports` workspace (`yarn report`) — session scanner/parser
(CSV + manifest + assets), per-session name maps, aggregation (class + per-student, by
module/skill/difficulty, per-question), HTML render, Puppeteer PDF. Output goes to the gitignored
`reports/out/<range>/`, one folder per run; a re-run clears its folder first so a stale per-student
PDF can't linger after a nickname edit changes the roster.

Refinements the human drove, each verified against a generated 16-student example session:
- Accuracy is **correct / answered** — unanswered questions are excluded, not counted wrong; a
  separate "Questions answered — X / total" tile carries participation (late arrival / early exit).
- Green/yellow/red status at 80/60 thresholds: keyed off the *displayed* rounded percentage so a
  square never contradicts its number; used as roster/tile swatches and as the bar-fill colour on
  the breakdowns.
- The confusing "vs class" tile became a **Class standing** histogram: the class's accuracy
  distribution with the student marked and their z-score ("+1.2σ above the class mean").
- Per-question meta: accuracy left, module pill then skill pill(s) at the right; chart-option
  questions render the actual charts instead of option ids.
- Each breakdown is a 1/3–2/3 row: a RAG **pie** of its rows on the left, the bars (or roster) on
  the right; the class report gains a students pie before the roster.
- Header shows the report's date range (once for a single session); dropped the sessions/answers
  counts and the redundant answered/correct columns.

Full monorepo typecheck + build green; the whole pipeline verified end-to-end (aggregation, name
merging across sessions, question recreation incl. SVG, filenames, PDF rendering) against realistic
fixtures written with the game's own SessionWriter.

### Human — plugin ecosystem: assessed, deferred, and one leak cleaned

The human's goal: question modules as isolated plugins, with the core engine knowing nothing about
specific archetypes and merely querying a module for a question.

**AI finding — the premise was already half true.** The engine does not know about archetypes:
`api/src/*` contains no reference to any module id or archetype name, `drawQuestion` is just
`getModule(id).generate(rng)`, and skills/difficulty are module-authored values passed through
untouched. Neither client references a specific module either.

**What actually blocks a plugin system**, which is a different problem than the one assumed:
`AnswerKey`/`Submission` are closed two-member unions and grading lives in the core, switched on
`format` in three places (`grade()`, building `RevealInfo`, and the student history). So a module
wanting ordering, matching, multi-select or short-text answers cannot be written without editing
core. Secondary: the registry is a hand-maintained switchboard, and modules live inside `shared/`.

The human chose to **pause** the refactor and record it. Added a TODO.md section with the finding,
the three real blockers, a three-phase plan (tighten the contract → move grading/reveal into the
module → extract a `@edugame/module-api` and relocate modules), and the constraint that this code
ships to browsers, so "plugin" means a clean contract plus one registration point rather than
runtime loading.

**Shipped alongside:** the one cleanup with no side effects — `shared/src/index.ts` re-exported
`modules/boxplot-common.js`, leaking a single module's helpers into the core's public API. Verified
all four symbols are used only by `boxplot.ts` (which imports the file directly, not via the
barrel), removed the re-export, and confirmed a clean typecheck and build across every workspace.

### Human — plugin migration, phase 2: the engine stops interpreting answer keys

Having recorded the plugin work earlier, the human asked for a model and then to start building.
The model agreed: three layers (a contract-only `module-api`, plugins that own their own behaviour,
and a composition root that injects the registry), governed by one rule — **keys open, submissions
bounded**. A module may invent any answer-key shape because only it grades that key; `Submission`
stays a small versioned union because a browser client cannot render an answer widget it has never
heard of.

**Built first (phase 2, the only phase that changes behaviour):** `QuestionModule` gained
`grade(key, submission)` and `reveal(key)`. Every site where the engine previously switched on an
answer format now asks the owning module instead — grading during reveal, building `RevealInfo`,
the student history (which resolves a *recorded* key via its module), and the reports tool. The
central `grade()` is gone; `gradeStandardAnswer` / `revealStandardAnswer` remain as opt-in helpers
that modules wire in as one-liners. `RevealInfo` became `{ questionId } & RevealAnswer`, so the
module produces the answer half and the engine supplies only the id it owns.

**Verified:** a grep for answer-shape switches outside modules returns nothing. 1,500 generated
questions across five modules confirmed `reveal()` always names the key's true correct option and
`grade()` returns true/false correctly on right and wrong picks, zero defects. Then live: joined a
real game, answered, revealed, and confirmed the student history resolved its `correctOptionId`
through the module. Full typecheck and build clean; 62 lines changed.

**What it bought:** a module can now invent and grade its own key shape without touching core.
`AnswerKey` is still a closed union, but nothing switches on it, so widening it is a pure type
change with no call-site churn.

### Human — plugin migration, phase 1: the engine is handed its registry

Continuing the staged migration, the switchboard went next. `shared/src/modules/index.ts` used to
import every module, build the array, and export a global `getModule` that the engine reached for
directly — so the core package had to be edited to add a module.

**AI implementation:** a new `shared/src/registry.ts` holds the lookup contract (`ModuleRegistry`,
`ModuleInfo`) and a `createRegistry` factory, and deliberately imports no modules at all.
`modules/index.ts` is now just a manifest naming the stock list and exporting `defaultRegistry`.
`GameSession` takes a `ModuleRegistry` in its constructor; all nine former `getModule` lookups go
through it. The applications compose: `api/src/main.ts` for the game (also passing the registry to
the educator app, which serves the picker catalog from it) and `reports/src/aggregate.ts` for the
report generator. `createRegistry` rejects duplicate ids.

**Verified by actually using it as a plugin system:** built a module with its *own* key shape, its
own `grade` and its own `reveal` — a term the core has never heard of — composed a `GameSession`
from a registry containing only that module, and played a question through it. It graded correctly
and produced its own reveal payload, while the stock registry (17 modules) had no knowledge of it.
Then a live regression on the real game: catalog served from the injected registry, a question
drawn, answered, revealed, and both the history's `correctOptionId` and the analytics module label
resolved through the registry. Typecheck and build clean.

**Honest limit:** the third-party key needed a cast, because `AnswerKey` is still the closed union.
Widening it is the remaining scrap of phase 2 and is now a pure type change — nothing switches on
it any more.
