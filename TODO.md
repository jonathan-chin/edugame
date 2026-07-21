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
