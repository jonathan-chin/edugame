/**
 * Module: Box-and-whisker plots.
 *
 * One selectable module (topic) that generates questions in two sub-skills, chosen at
 * random per question via the seeded RNG:
 *   - "Graphical literacy": read a value (min, quartile, median, max) off one box plot.
 *   - "Numerical literacy": identify which of four box plots matches a described property.
 */

import { svg, text } from "../content.js";
import type { AnswerOption, GeneratedQuestion, QuestionModule } from "../question.js";
import type { RNG } from "../rng.js";
import { boxPlotSvg, type FiveNumber } from "../svg.js";
import { BOXPLOT_DOMAIN, buildBoxPlot, FIVE_NUMBER_LABELS, type FiveNumberKey } from "./boxplot-common.js";

const MODULE_ID = "boxplot";
const SKILL_GRAPHICAL = "Graphical literacy";
const SKILL_NUMERICAL = "Numerical literacy";

const KEYS: FiveNumberKey[] = ["min", "q1", "median", "q3", "max"];

// Sub-skill: read a value off one box plot.
function generateGraphical(rng: RNG): GeneratedQuestion {
  const fn = buildBoxPlot(rng);
  const askedKey = rng.pick(KEYS);
  const correctValue = fn[askedKey];

  const others = KEYS.filter((k) => k !== askedKey).map((k) => fn[k]);
  const distractorPool = Array.from(new Set(others.filter((v) => v !== correctValue)));
  const distractors = rng.shuffle(distractorPool).slice(0, 3);

  const values = rng.shuffle([correctValue, ...distractors]);
  let correctOptionId = "";
  const options: AnswerOption[] = values.map((v, i) => {
    const id = `opt-${i}`;
    if (v === correctValue && !correctOptionId) correctOptionId = id;
    return { id, content: { kind: "text", text: String(v) } };
  });

  return {
    public: {
      id: rng.id("bpr"),
      moduleId: MODULE_ID,
      skill: SKILL_GRAPHICAL,
      difficulty: askedKey === "median" || askedKey === "min" || askedKey === "max" ? 2 : 3,
      prompt: svg(boxPlotSvg(fn, BOXPLOT_DOMAIN), `What is the ${FIVE_NUMBER_LABELS[askedKey]} of this data?`),
      answerFormat: "multiple-choice",
      options,
    },
    key: { format: "multiple-choice", correctOptionId },
  };
}

interface Property {
  label: string;
  direction: "max" | "min";
  metric: (p: FiveNumber) => number;
}

const PROPERTIES: Property[] = [
  { label: "the highest median", direction: "max", metric: (p) => p.median },
  { label: "the lowest minimum", direction: "min", metric: (p) => p.min },
  { label: "the highest maximum", direction: "max", metric: (p) => p.max },
  { label: "the largest interquartile range (Q3 − Q1)", direction: "max", metric: (p) => p.q3 - p.q1 },
  { label: "the largest range (max − min)", direction: "max", metric: (p) => p.max - p.min },
];

function bestIndex(plots: FiveNumber[], prop: Property): number {
  let best = 0;
  for (let i = 1; i < plots.length; i++) {
    const better = prop.direction === "max" ? prop.metric(plots[i]!) > prop.metric(plots[best]!) : prop.metric(plots[i]!) < prop.metric(plots[best]!);
    if (better) best = i;
  }
  return best;
}

function hasUniqueWinner(plots: FiveNumber[], prop: Property): boolean {
  const winner = prop.metric(plots[bestIndex(plots, prop)]!);
  return plots.filter((p) => prop.metric(p) === winner).length === 1;
}

// Sub-skill: identify the box plot matching a described property.
function generateNumerical(rng: RNG): GeneratedQuestion {
  const prop = rng.pick(PROPERTIES);

  let plots: FiveNumber[] = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    plots = Array.from({ length: 4 }, () => buildBoxPlot(rng));
    if (hasUniqueWinner(plots, prop)) break;
  }

  const winner = bestIndex(plots, prop);
  let correctOptionId = "";
  const options: AnswerOption[] = plots.map((fn, i) => {
    const id = `plot-${i}`;
    if (i === winner) correctOptionId = id;
    return { id, content: svg(boxPlotSvg(fn, BOXPLOT_DOMAIN)) };
  });

  return {
    public: {
      id: rng.id("bpi"),
      moduleId: MODULE_ID,
      skill: SKILL_NUMERICAL,
      difficulty: 3,
      prompt: text(`Which box plot has ${prop.label}?`),
      answerFormat: "multiple-choice",
      options,
    },
    key: { format: "multiple-choice", correctOptionId },
  };
}

export const boxplotModule: QuestionModule = {
  id: MODULE_ID,
  title: "Box-and-whisker plots",
  shortTitle: "Box-and-whisker",
  description: "Reading and comparing box-and-whisker plots.",
  generate(rng: RNG): GeneratedQuestion {
    return rng.bool() ? generateGraphical(rng) : generateNumerical(rng);
  },
};
