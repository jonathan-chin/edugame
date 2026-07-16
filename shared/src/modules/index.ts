/**
 * The module registry.
 *
 * A module is a selectable topic (what appears in the educator's module modal). Each
 * module may generate several sub-skill variants internally, tagged on the question's
 * `skill`. Adding a module is a one-line change here.
 */

import type { QuestionModule } from "../question.js";
import { boxplotModule } from "./boxplot.js";
import { stdevModule } from "./stdev.js";

export const MODULES: readonly QuestionModule[] = [stdevModule, boxplotModule];

const BY_ID = new Map<string, QuestionModule>(MODULES.map((m) => [m.id, m]));

export function getModule(id: string): QuestionModule | undefined {
  return BY_ID.get(id);
}

/** Lightweight descriptor for the educator's module picker. */
export interface ModuleInfo {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
}

export function moduleCatalog(): ModuleInfo[] {
  return MODULES.map(({ id, title, shortTitle, description }) => ({
    id,
    title,
    shortTitle,
    description,
  }));
}

export { stdevModule, boxplotModule };
