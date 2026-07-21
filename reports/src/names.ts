/**
 * Per-session nickname maps.
 *
 * Students often change nicknames between sessions, or one person's "Ace" is a different person's
 * "Ace" a week later. Rather than a global map (which can't tell those two apart) or token
 * plumbing (opaque to hand-edit), each session carries its own sidecar: `<id>.names.json`,
 * mapping the **observed** name to the **canonical** display name. Because the file is scoped to
 * one session, the same nickname in two sessions is two independent entries — the collision the
 * global approach couldn't resolve simply cannot arise.
 *
 * The map is generated on first sight and identity-by-default: the observed name, cleaned up to
 * title case, is its own canonical value. A human edits only the entries that are really
 * nicknames — changing the value merges those answers under the intended person. The file lives
 * in the gitignored sessions directory, so it persists for reproducible re-runs without ever
 * reaching git.
 */

import fs from "node:fs";
import path from "node:path";

/** Observed name (as stored in the CSV) -> canonical display name. */
export type NameMap = Record<string, string>;

/** Title-case a cleaned name: "ada LOVELACE" -> "Ada Lovelace". The alias value overrides this,
 *  so a name this mangles (e.g. "McDonald") is fixed once by editing the map. */
export function titleCase(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

const mapPath = (dir: string, sessionId: string) => path.join(dir, `${sessionId}.names.json`);

/**
 * Load a session's name map, creating it if absent. New observed names (present in the data but
 * missing from an existing map) are appended as identity entries, so a re-run after more play
 * never silently drops a student. Returns the resolved map.
 */
export function loadOrCreateNameMap(dir: string, sessionId: string, observedNames: string[]): NameMap {
  const file = mapPath(dir, sessionId);
  let map: NameMap = {};
  if (fs.existsSync(file)) {
    try {
      map = JSON.parse(fs.readFileSync(file, "utf8")) as NameMap;
    } catch {
      map = {}; // Corrupt/hand-broken file: fall back to identity rather than crashing a report.
    }
  }
  let changed = false;
  for (const name of observedNames) {
    if (!(name in map)) {
      map[name] = titleCase(name);
      changed = true;
    }
  }
  if (changed || !fs.existsSync(file)) {
    const ordered = Object.fromEntries(Object.keys(map).sort((a, b) => a.localeCompare(b)).map((k) => [k, map[k]!]));
    fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + "\n", "utf8");
  }
  return map;
}

/** Resolve one observed name to its canonical form, defaulting to title case when unmapped. */
export function canonical(map: NameMap, observed: string): string {
  return map[observed] ?? titleCase(observed);
}
