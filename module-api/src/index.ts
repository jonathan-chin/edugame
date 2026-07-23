/**
 * @philosoph/module-api — the contract between the game engine and a question module.
 *
 * Everything a module author needs, and nothing about the game itself: how a question is shaped,
 * how an answer is graded and revealed, the content nodes a prompt can be built from, the seeded
 * RNG that keeps a session reproducible, and the registry an application composes.
 *
 * This package depends on nothing. The engine and the modules both depend on it; neither depends
 * on the other.
 */

export * from "./content.js";
export * from "./rng.js";
export * from "./question.js";
export * from "./registry.js";
