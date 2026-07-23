/**
 * Picks the shell for this bundle: the classroom game, or a solo study session.
 *
 * Synchronous by design — the mode is in the document when React starts, so there is no
 * loading state, no flash of the wrong app, and no way for a network hiccup to decide which
 * one a person sees. See `readServerMode`.
 */

import { App } from "./App";
import { SoloApp } from "./SoloApp";
import { readServerMode } from "./lib/serverMode";

export function Root() {
  return readServerMode() === "solo" ? <SoloApp /> : <App />;
}
