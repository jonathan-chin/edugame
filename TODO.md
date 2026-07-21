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
