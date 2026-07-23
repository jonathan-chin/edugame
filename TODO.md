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
2. ~~**The registry is a hand-maintained switchboard**~~ **Done.** `GameSession` now takes a
   `ModuleRegistry` in its constructor instead of importing a global lookup, and
   `shared/src/modules/index.ts` is a manifest whose only job is naming the stock list. An
   application composes the registry (`api/src/main.ts`, `reports/src/aggregate.ts`); the engine
   has no opinion about which modules exist.
3. ~~**Modules live inside `shared/`**~~ **Done.** Three packages now: `@philosoph/module-api` (the
   contract, zero dependencies), `@philosoph/modules` (the plugins, depending only on the contract),
   and `@philosoph/shared` (game-level state/analytics/recording, which re-exports the contract but
   names no module). Applications compose: only `api/src/main.ts` and `reports/src/aggregate.ts`
   import `@philosoph/modules`.

**Planned phases:**
- *Phase 1 — tighten the contract.* **Done.** `registry.ts` holds the lookup contract and a
  `createRegistry` factory and imports no modules; `modules/index.ts` is the manifest. Verified by
  composing a session from a registry containing only a third-party module.
- *Phase 2 — move grading and reveal into the module (the unlock).* **Done.** The follow-up
  (widening `AnswerKey` to an opaque per-module type) was **superseded**: every module is
  multiple-choice for now, so the answer types were collapsed to a single shape instead. Widening
  becomes relevant again only when a second interaction type is added.
- *Phase 3 — physical boundary.* **Done.** The chart/statistics helpers (`svg`, `distributions`,
  `stats`) turned out to be used only by the chart modules, so they travelled with them rather than
  bloating the contract.

**All three phases are complete.** What a new module now needs: depend on `@philosoph/module-api`,
export a `QuestionModule`, and have an application add it to a registry. Nothing in the core changes.

**Remaining caveat:** the boundary is *declared* (via package dependencies) rather than hard-enforced,
because this repo uses Yarn's `node-modules` linker, which hoists and would let an undeclared import
resolve anyway. Under Plug'n'Play, or with a lint rule forbidding cross-package deep imports, it
would be enforced by the resolver.

**Constraint to remember:** this code ships to browsers, so there is no filesystem discovery or
runtime plugin loading. "Plugin" here means a clean contract plus one registration point — Phases
1–2 achieve that; Phase 3 makes the boundary enforceable.

**Current simplification:** every question is multiple-choice. `AnswerFormat` is a one-member
union, `AnswerKey`/`RevealAnswer` are `{ correctOptionId }` and `Submission` is `{ optionId }`. The
value format was removed as dead — no module ever generated one and neither client could render it.
Adding a second interaction type (ordering, matching, short text) means widening these *and*
building the client widgets to collect and display it; that is the real cost, not the types.

**The rule that shapes the rest: keys open, submissions bounded.** A module may invent any key
shape, because only it grades that key. `Submission` stays a small versioned union, because a
browser client cannot render an answer widget it has never heard of — so the clients own a bounded
set of answer affordances and a module *chooses* one rather than inventing one. Open submissions
instead, and every plugin has to ship client code.

## A timed-out, unanswered question is omitted from progress (not counted wrong)

If the per-question answer timer expires and the student never selected an option, **nothing is
recorded** for them: `session.reveal()` grades only `currentAnswers` (the students who actually
submitted), so no answer event is written. It therefore does not appear in their progress at
all — not as answered, not as correct, not as wrong; it drops out of `answered`, `accuracy`, and
the history. Same code for classroom and solo (`api/src/session.ts` `reveal`/`progress`).

This is intended for a **classroom** (a student who ran out of time isn't penalised as if they
guessed wrong). For **solo self-study** the opposite may be more honest — letting the clock run
out is effectively "I didn't know it" — and today it's a consequence-free way to skip a question
from your stats. Kept as-is 2026-07-22.

Revisit options (not yet decided): leave it; or in solo, record a timeout as `isCorrect=0`; or
record timeouts as their own third state ("timed out") distinct from right/wrong in the report.

Related failsafe already in place (2026-07-22): a timed-out, unanswered reveal in solo does **not**
start the auto-advance countdown — it waits for a manual "Next question" — so an accidental
walk-away can't run the game (and burn per-question resources) unattended. See
`student/src/SoloApp.tsx` (`useAutoAdvance` gated on `selected != null`).

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
