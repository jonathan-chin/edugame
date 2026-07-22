/**
 * The module manifest: the single place that names which question modules exist.
 *
 * This is a composition detail, not engine logic. The engine never imports this file — it is
 * handed a `ModuleRegistry` (see `../registry.ts`) built from whatever list an application
 * chooses, so adding or removing a module touches only this manifest.
 *
 * `defaultRegistry` is the stock set used by the game and the report generator.
 */

import { createRegistry, type ModuleRegistry, type QuestionModule } from "@edugame/module-api";
import { boxplotModule } from "./boxplot.js";
import { COURSE_VOCAB_MODULES } from "./course-vocab.js";
import { stdevModule } from "./stdev.js";
import { VOCAB_MODULES } from "./vocab.js";

export const MODULES: readonly QuestionModule[] = [
  stdevModule,
  boxplotModule,
  ...VOCAB_MODULES,
  ...COURSE_VOCAB_MODULES,
];

/** The stock registry. Applications may build their own from a different list. */
export const defaultRegistry: ModuleRegistry = createRegistry(MODULES);

export { stdevModule, boxplotModule, VOCAB_MODULES, COURSE_VOCAB_MODULES };
