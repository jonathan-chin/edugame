/**
 * The module registry: the only thing the engine needs in order to find a question module.
 *
 * This file deliberately imports no modules. It defines the lookup contract and a factory; the
 * *list* of modules lives in a manifest (`modules/index.ts`) that an application composes and
 * hands to the engine. The engine takes a registry rather than reaching for a global, so nothing
 * in the core depends on which modules happen to exist.
 */

import type { QuestionModule } from "./question.js";

/** Lightweight descriptor for the educator's module picker. */
export interface ModuleInfo {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
}

export interface ModuleRegistry {
  /** The module with this id, or undefined when nothing is registered under it. */
  get(id: string): QuestionModule | undefined;
  /** Every registered module, in manifest order. */
  all(): readonly QuestionModule[];
  /** The picker-facing descriptors, in manifest order. */
  catalog(): ModuleInfo[];
}

/** Build a registry from a list of modules. Ids must be unique. */
export function createRegistry(modules: readonly QuestionModule[]): ModuleRegistry {
  const byId = new Map<string, QuestionModule>();
  for (const m of modules) {
    if (byId.has(m.id)) throw new Error(`Duplicate module id: ${JSON.stringify(m.id)}`);
    byId.set(m.id, m);
  }
  return {
    get: (id) => byId.get(id),
    all: () => modules,
    catalog: () => modules.map(({ id, title, shortTitle, description }) => ({ id, title, shortTitle, description })),
  };
}
