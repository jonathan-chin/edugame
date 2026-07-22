/**
 * A complete, working question module, kept as the reference to copy when writing a new one.
 *
 * It is compiled and type-checked with the rest of this package — so it cannot silently rot — but
 * it is deliberately **not** in the manifest in `index.ts`, so it never appears in the educator's
 * module picker. To use it for real, add it to a registry (see the README).
 *
 * The module it implements is trivial on purpose: "which of these is a power of two". The point is
 * the shape and the constraints, not the subject.
 */

import {
  gradeStandardAnswer,
  revealStandardAnswer,
  text,
  type AnswerOption,
  type GeneratedQuestion,
  type QuestionModule,
  type RNG,
} from "@edugame/module-api";

/** Ids are the stable key for a module: they appear in saved CSVs and manifests, so changing one
 *  orphans every answer already recorded against it. Choose it once. */
const MODULE_ID = "template-powers-of-two";

/**
 * Sub-skills this module can tag a question with. These strings are what the analytics and the
 * reports group by, so keep them short, stable, and shared across modules that mean the same
 * thing (e.g. reuse "Numerical literacy" rather than inventing "Numbers").
 */
const SKILL_RECOGNITION = "Numerical literacy";

/**
 * Generate one question.
 *
 * The single hard rule: **all randomness must come from `rng`**. `Math.random()`, `Date.now()` and
 * anything else non-deterministic will break session reproducibility — a session replays from its
 * seed, so the same seed must always yield the same questions.
 */
function generate(rng: RNG): GeneratedQuestion {
  // The correct answer: a power of two somewhere in a readable range.
  const exponent = rng.int(3, 10); // 8 .. 1024
  const correctValue = 2 ** exponent;

  // Distractors: near-misses rather than arbitrary numbers, so the question tests the concept
  // instead of rewarding a glance. Neighbours of a power of two are the tempting wrong answers.
  const wrongValues = new Set<number>();
  while (wrongValues.size < 3) {
    const candidate = correctValue + rng.pick([-3, -2, -1, 1, 2, 3, 6, -6]);
    // Never offer a second correct answer: reject anything that is itself a power of two.
    const isPowerOfTwo = candidate > 0 && (candidate & (candidate - 1)) === 0;
    if (candidate > 1 && !isPowerOfTwo) wrongValues.add(candidate);
  }

  // Shuffle through the rng (not Array.sort) so option order is reproducible too.
  const values = rng.shuffle([correctValue, ...wrongValues]);
  const options: AnswerOption[] = values.map((v, i) => ({ id: `o${i}`, content: text(String(v)) }));
  const correctOptionId = options[values.indexOf(correctValue)]!.id;

  return {
    public: {
      // `rng.id` keeps question ids deterministic as well; they key the recorded manifest.
      id: rng.id("tpl"),
      moduleId: MODULE_ID,
      skills: [SKILL_RECOGNITION], // zero or more; each answer counts toward every skill listed
      difficulty: 1, // 1 (easiest) .. 5 (hardest)
      prompt: text("Which of these is a power of two?"),
      answerFormat: "multiple-choice",
      options,
    },
    // The key never leaves the server until the educator reveals.
    key: { correctOptionId },
  };
}

export const templateModule: QuestionModule = {
  id: MODULE_ID,
  title: "Template · powers of two", // shown in the educator's module picker
  shortTitle: "Template", // compact label for analytics and report charts
  description: "A reference module for developers — not real course content.",
  generate,

  // Grading and reveal belong to the module, which is what lets a module define correctness its
  // own way. These two questions use the standard shape, so they wire in the stock helpers.
  //
  // To accept more than one correct option, or to grade with a tolerance, replace them with your
  // own — the engine never inspects a key, it only calls these:
  //
  //   grade: (key, submission) => myAcceptedIds(key).includes(submission.optionId),
  //   reveal: (key) => ({ correctOptionId: myPreferredId(key) }),
  //
  grade: gradeStandardAnswer,
  reveal: revealStandardAnswer,
};
