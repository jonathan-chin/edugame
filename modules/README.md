# @edugame/modules

The stock question modules. A module is a plugin: it generates questions, grades them, and says
what to reveal. It depends only on `@edugame/module-api`, and nothing in the game engine knows any
module exists.

## Writing one

Start by copying [`src/template.ts`](src/template.ts) — a complete, working, heavily commented
module. It is compiled and type-checked with this package (so it cannot rot), but is deliberately
left out of the manifest, so it never shows up in the educator's picker.

A module is one object:

```ts
export const myModule: QuestionModule = {
  id: "my-module",              // stable forever — it is written into every saved CSV row
  title: "My module",           // shown in the educator's picker
  shortTitle: "Mine",           // compact label for analytics and report charts
  description: "One line about what it asks.",
  generate(rng) { /* → { public, key } */ },
  grade: gradeStandardAnswer,   // or your own
  reveal: revealStandardAnswer, // or your own
};
```

Then add it to the manifest in [`src/index.ts`](src/index.ts) so it ships with the game — or leave
it out and have an application compose its own registry:

```ts
import { createRegistry } from "@edugame/module-api";
const registry = createRegistry([myModule]);
new GameSession(id, seed, registry);
```

## The rules that actually matter

**All randomness comes from `rng`.** No `Math.random()`, no `Date.now()`. A session replays from
its seed, so the same seed must always produce the same questions — that is what makes a game
reproducible and a recorded session trustworthy. Use `rng.shuffle` rather than sorting, and
`rng.id()` for question ids.

**Never offer two correct answers.** The most damaging failure is a question where a strong student
spots a second defensible option. When you build distractors from near-misses — which you should,
or the question tests reading rather than knowledge — check explicitly that none of them is also
right. The template does this.

**Ids are permanent.** `id` is written into every CSV row and manifest. Changing it orphans every
answer already recorded against it.

**Skills are shared vocabulary.** The strings in `skills` are what analytics and the reports group
by. Reuse an existing one (`"Numerical literacy"`, `"Definitions"`) rather than inventing a synonym.
A question may carry several skills or none; an answer counts once toward each.

## Grading is yours

The engine never inspects an answer key — it only calls your `grade` and `reveal`. Using the
standard shape? Wire in `gradeStandardAnswer` / `revealStandardAnswer`. Need to accept several
options, or grade by tolerance, or compute correctness from something you stored in the key? Write
your own two functions; nothing in the core changes.

Today every question is multiple-choice, because a browser client can only collect an interaction
it has a widget for. Adding a new interaction type (ordering, matching, short text) means widening
`AnswerFormat` *and* building the client widgets to collect and display it — the widgets are the
real work, not the types.

## Where things live

| Package | Holds | Depends on |
| --- | --- | --- |
| `@edugame/module-api` | the contract: content, RNG, question/answer types, `QuestionModule`, registry | nothing |
| `@edugame/modules` | these modules, plus their private chart/stat helpers | the contract |
| `@edugame/shared` | game-level state, WebSocket protocol, analytics, recording | the contract |

Helpers used by only one module stay private to this package (`svg.ts`, `distributions.ts`,
`stats.ts` are here for exactly that reason). Don't add them to the contract — it stays slim so a
module author has a small surface to learn.

## Checking your work

`yarn build:shared` type-checks and builds all three packages. Beyond that, generate a few hundred
questions and assert the things that are easy to get wrong:

- every question has four distinct options and a resolvable key
- the same seed twice produces an identical question
- `grade` returns true for the keyed option and false for the others
- no distractor is also a correct answer

Banks assembled from data can also validate at import — see `validateVocabBank` in `vocab.ts`,
which throws on a malformed bank when the module is constructed rather than mid-class.
