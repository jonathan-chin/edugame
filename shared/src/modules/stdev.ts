/**
 * Module: Standard deviation.
 *
 * One selectable module (topic) that generates questions in two sub-skills, chosen at
 * random per question via the seeded RNG:
 *   - "Graphical literacy": read one distribution and classify how spread out it is.
 *   - "Numerical literacy": compare four distributions and pick the largest/smallest σ.
 */

import { svg, text } from "../content.js";
import { BELL_DOMAIN, makeDistribution, SPREAD_LEGIBLE_FAMILIES, UNIMODAL_FAMILIES } from "../distributions.js";
import type { AnswerOption, GeneratedQuestion, QuestionModule } from "../question.js";
import { gradeStandardAnswer, revealStandardAnswer } from "../question.js";
import type { RNG } from "../rng.js";
import { round, STDEV_CATEGORIES } from "../stats.js";
import { densitySvg } from "../svg.js";

const MODULE_ID = "stdev";
const SKILL_GRAPHICAL = "Graphical literacy";
const SKILL_NUMERICAL = "Numerical literacy";

// Sub-skill: classify the spread of a single distribution.
function generateGraphical(rng: RNG): GeneratedQuestion {
  const target = rng.pick(STDEV_CATEGORIES);
  const targetSd = round(rng.float(target.range[0], target.range[1]), 2);
  const dist = makeDistribution(rng, targetSd, UNIMODAL_FAMILIES);

  const options = STDEV_CATEGORIES.map((cat) => ({
    id: cat.id,
    content: { kind: "text" as const, text: cat.label },
  }));

  return {
    public: {
      id: rng.id("sdg"),
      moduleId: MODULE_ID,
      skills: [SKILL_GRAPHICAL],
      difficulty: dist.family === "normal" ? 2 : 3,
      prompt: svg(densitySvg(dist.pdf, BELL_DOMAIN), "How spread out is this distribution?"),
      answerFormat: "multiple-choice",
      options,
    },
    key: { correctOptionId: target.id },
  };
}

// Sub-skill: compare four distributions and pick the σ extreme.
function generateNumerical(rng: RNG): GeneratedQuestion {
  const dir = rng.pick(["largest", "smallest"] as const);
  const targetBucket = dir === "largest" ? "very-large" : "near-zero";

  const built = rng.shuffle(STDEV_CATEGORIES).map((cat) => {
    const targetSd = round(rng.float(cat.range[0], cat.range[1]), 2);
    return { catId: cat.id, dist: makeDistribution(rng, targetSd, SPREAD_LEGIBLE_FAMILIES) };
  });

  let correctOptionId = "";
  const options: AnswerOption[] = built.map((b, i) => {
    const id = `curve-${i}`;
    if (b.catId === targetBucket) correctOptionId = id;
    return { id, content: svg(densitySvg(b.dist.pdf, BELL_DOMAIN)) };
  });

  return {
    public: {
      id: rng.id("sdn"),
      moduleId: MODULE_ID,
      skills: [SKILL_NUMERICAL],
      difficulty: 2,
      prompt: text(`Which distribution has the ${dir} standard deviation?`),
      answerFormat: "multiple-choice",
      options,
    },
    key: { correctOptionId },
  };
}

export const stdevModule: QuestionModule = {
  id: MODULE_ID,
  title: "Standard deviation",
  shortTitle: "Standard deviation",
  description: "Reading and comparing the spread of distributions.",
  generate(rng: RNG): GeneratedQuestion {
    return rng.bool() ? generateGraphical(rng) : generateNumerical(rng);
  },
  grade: gradeStandardAnswer,
  reveal: revealStandardAnswer,
};
