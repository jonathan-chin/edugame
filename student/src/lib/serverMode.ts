/**
 * Which shell this bundle should render, delivered by the server in the document itself.
 *
 * One bundle carries both the classroom game and the solo study session, and the difference is
 * not cosmetic — the solo shell has controls (reveal, next) a classroom student must never
 * drive. So the mode is never guessed, stored, or built in.
 *
 * It used to be fetched from `/api/state`, which was wrong in a way worth recording: a fetch
 * can fail, and *any* answer picked on failure is a guess that shows someone the wrong app.
 * Reading it from a meta tag the server stamps into index.html has no failure mode — it is
 * present before React runs, and it comes from the same server that decides which routes exist,
 * so the shell and the capability behind it cannot disagree.
 *
 * `classroom` is the default when the tag is missing (an old cached document), because it is
 * the shell that grants nothing.
 */

import type { GameMode } from "@philosoph/shared";

export function readServerMode(): GameMode {
  const content = document.querySelector('meta[name="edugame-mode"]')?.getAttribute("content");
  return content === "solo" ? "solo" : "classroom";
}
