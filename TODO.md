# TODO

Deferred work and known-rough edges to revisit. Narrative history lives in `COLLABORATION.md`;
this file is the short list of things we chose to ship as-is but want to harden later.

## Question difficulty is a hand-assigned constant, not a measured value

`difficulty` (1–5 on `QuestionInstance`) is currently hard-coded per question *type* in each
generator — e.g. `shared/src/modules/vocab.ts` maps Definitions→1, Analogies/Red flags→2,
Distinctions→3; `stdev.ts`/`boxplot.ts` set 2–3 by question variant. It is an author's guess, not
anything derived from how students actually perform.

Consequences:
- For the vocabulary modules (most of the content) difficulty is a **deterministic restatement of
  the skill**, so the reports' **"By difficulty"** section is the same data as **"By skill"**, just
  relabelled (Difficulty 1 ≡ Definitions, Difficulty 3 ≡ Distinctions). It only carries independent
  information where chart modules (stdev/boxplot) are mixed in.

Revisit options (not yet decided):
- Make difficulty **empirical** — derive it from observed class accuracy per question/type across
  sessions, so it reflects what students actually find hard.
- Or decouple difficulty from question type with a real per-question rating.
- Or drop "By difficulty" from the reports until it means something distinct from "By skill".

Touch points: `shared/src/modules/*.ts` (assignment), `reports/src/aggregate.ts` `byDifficulty`
(consumption), `api/src/session.ts` analytics. The kept-as-is decision and this flag were made
2026-07-20.

## Question modules should become a real plugin ecosystem

Goal: modules are isolated plugins; the core engine only ever queries a module for a question.

**Already true:** the engine knows nothing about archetypes. `api/src/*` contains no reference to
any module id or archetype, `drawQuestion` is just `getModule(id).generate(rng)`, and skills /
difficulty are module-authored values the engine passes through untouched. Neither client
references a specific module either.

**What actually blocks it** (verified 2026-07-21):

1. ~~**Answer formats are a closed union and grading lives in the core.**~~ **Done.** The engine no
   longer interprets answer keys: `QuestionModule` carries `grade(key, submission)` and
   `reveal(key)`, and every former switch site (grading, `RevealInfo`, student history, and the
   reports tool) now asks the owning module. `gradeStandardAnswer` / `revealStandardAnswer` are
   opt-in helpers modules wire in. `AnswerKey` is still a closed union, but nothing switches on it
   any more, so widening it is a pure type change with no call-site churn.
2. **The registry is a hand-maintained switchboard** — `shared/src/modules/index.ts` imports each
   module and builds the array, so adding a module means editing the core package.
3. **Modules live inside `shared/`** — no physical boundary between engine and plugin.

**Planned phases:**
- *Phase 1 — tighten the contract.* Collapse the registry to a single explicit manifest that is the
  only place listing modules. (The stale `boxplot-common` re-export from the core barrel was
  already removed.)
- *Phase 2 — move grading and reveal into the module (the unlock).* **Done.** What remains of it:
  widen `AnswerKey` from the closed union to an opaque per-module type, now that no call site
  switches on it.
- *Phase 3 — physical boundary.* Extract a slim `@edugame/module-api` (Content, RNG,
  QuestionInstance, AnswerKey contract) and move `modules/` to their own workspace depending only
  on it. Core never imports a module; the app composes them.

**Constraint to remember:** this code ships to browsers, so there is no filesystem discovery or
runtime plugin loading. "Plugin" here means a clean contract plus one registration point — Phases
1–2 achieve that; Phase 3 makes the boundary enforceable.

**The rule that shapes the rest: keys open, submissions bounded.** A module may invent any key
shape, because only it grades that key. `Submission` stays a small versioned union, because a
browser client cannot render an answer widget it has never heard of — so the clients own a bounded
set of answer affordances and a module *chooses* one rather than inventing one. Open submissions
instead, and every plugin has to ship client code.

## Interactive dashboard for reports (not yet built)

The report generator produces PDFs only. An interactive dashboard was scoped alongside it but
deferred. The constraints the human set: **true filtering/interactivity**, must **embed arbitrary
future media** (not just SVG — PNG/audio/video), and **no hosting** (opens by double-click).

Chosen shape (from that discussion, to build when picked up): a **self-contained bundle** shipped as
a `.zip` — `index.html` with the JS and the report data inlined as a `<script type="application/json">`
blob, and media as sibling files referenced by relative path (so `file://` loads images/audio/video
without base64 bloat, and future media types "just work"). No external/CDN requests, which also keeps
university AV/proxy filters calm; the PDFs remain the artifact for wide/email distribution.

It reuses the existing aggregation and per-question rendering (the PDF renderer inlines media, the
dashboard would reference it as sibling files — same components, two media resolvers). Flagged
2026-07-20.
