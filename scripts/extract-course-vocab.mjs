#!/usr/bin/env node
/**
 * Draft vocabulary atoms from a week of Marp course slides.
 *
 * This is a **drafting aid, not a source of truth**. It finds the places in a deck where a term
 * is likely being defined, contrasted, or corrected, and prints them with provenance so a human
 * can turn them into curated atoms. Roughly half of what it surfaces is not vocabulary at all
 * (install instructions, link lists, "Term: value" mappings), and many real definitions are
 * written to be read *beside their slide title* rather than on their own — a distractor has to
 * stand alone, so those need rewriting by hand. The committed atoms in
 * `shared/src/modules/course-vocab.ts` are what the game actually uses.
 *
 * Usage:
 *   node scripts/extract-course-vocab.mjs <slides-dir> <week-number>
 *
 * The week is read from each deck's `footer:` frontmatter ("… · Week 1: Theme"), and the day
 * from `description:` ("Week 1, Day 2 - Command Line and git").
 */

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const [, , slidesDir, weekArg] = process.argv;
if (!slidesDir || !weekArg) {
  console.error("usage: extract-course-vocab.mjs <slides-dir> <week-number>");
  process.exit(1);
}
const week = Number(weekArg);

/** Split a Marp deck into slides. The `---` separators sit on their own line, as does the
 *  closing fence of the YAML frontmatter — so drop the frontmatter block first. */
function slidesOf(markdown) {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, "");
  return body
    .split(/^---$/m)
    .map((s) => s.trim())
    .filter(Boolean);
}

function frontmatter(markdown, field) {
  const m = markdown.match(new RegExp(`^${field}:\\s*"?(.*?)"?\\s*$`, "m"));
  return m ? m[1] : "";
}

/** Slide title, minus Marp's directive comments. */
function titleOf(slide) {
  const m = slide.match(/^#\s+(.*)$/m);
  return m ? m[1].trim() : "";
}

/** Strip markdown emphasis/code/links down to plain prose. */
function plain(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The only filtering worth automating: a bare link, or something too short to work as a
 * standalone answer. Judging whether a line is *actually* a definition is the human's job —
 * that is the whole premise of this script.
 */
function isNoise(definition) {
  const d = definition.trim();
  return /^https?:\/\//.test(d) || d.length < 25;
}

/** A slide's prose, flattened — enough context to judge a candidate without opening the deck. */
function bodyOf(slide) {
  return slide
    .split("\n")
    .slice(1)
    .filter((l) => l.trim() && !l.startsWith("![") && !l.startsWith("<"))
    .map((l) => plain(l))
    .join(" ")
    .slice(0, 300);
}

const decks = readdirSync(slidesDir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({ file: f, text: readFileSync(join(slidesDir, f), "utf8") }))
  .filter((d) => frontmatter(d.text, "footer").includes(`Week ${week}:`))
  .sort((a, b) => a.file.localeCompare(b.file));

if (decks.length === 0) {
  console.error(`No decks found for week ${week} in ${slidesDir}`);
  process.exit(1);
}

const theme = frontmatter(decks[0].text, "footer").split("·").pop().trim();
console.log(`# Week ${week} vocabulary candidates\n`);
console.log(`**${theme}** — ${decks.length} decks: ${decks.map((d) => basename(d.file, ".md")).join(", ")}\n`);

const buckets = { definition: [], contrast: [], prose: [], followUp: [] };

for (const deck of decks) {
  const day = frontmatter(deck.text, "description");
  const src = `${basename(deck.file, ".md")} · ${day}`;

  for (const slide of slidesOf(deck.text)) {
    const title = titleOf(slide);
    if (!title) continue;

    // 1. `- **Term**: definition` — the densest pattern, and the noisiest.
    for (const line of slide.split("\n")) {
      const m = line.match(/^\s*-\s+\*\*(.+?)\*\*:\s*(.+)$/);
      if (!m) continue;
      const [, term, def] = m;
      if (isNoise(plain(def))) continue;
      buckets.definition.push({ term: plain(term), definition: plain(def), slide: title, src });
    }

    // 2. `X vs. Y` slide titles — contrast pairs, the raw material for Distinctions.
    // Case-sensitive on purpose: an uppercase "VS" is "VS Code", not a contrast.
    const vs = title.match(/^(?:.*?:\s*)?(.+?)\s+vs\.?\s+(.+)$/);
    if (vs) {
      buckets.contrast.push({ a: plain(vs[1]), b: plain(vs[2]), slide: title, src, body: bodyOf(slide) });
    }

    // 3. A title that is just a term, followed by a prose sentence defining it.
    const prose = slide.split("\n").slice(1).join("\n").trim().split("\n\n")[0] ?? "";
    if (!vs && /^[A-Z`][\w '`/.-]{2,40}$/.test(title) && /^[A-Z`]/.test(prose) && prose.length > 40 && !prose.startsWith("-")) {
      buckets.prose.push({ term: title, definition: plain(prose), src });
    }

    // 4. "Follow Up:" slides — concepts that needed re-teaching, i.e. where the class got
    //    confused. The best source of `misconception` fields in the whole deck set.
    if (/^Follow.?Up/i.test(title)) {
      buckets.followUp.push({ slide: title, src, body: bodyOf(slide) });
    }
  }
}

function section(name, rows, render) {
  console.log(`\n## ${name} (${rows.length})\n`);
  for (const r of rows) console.log(render(r));
}

section("Term → definition bullets", buckets.definition, (r) => `- **${r.term}** — ${r.definition}\n  - _${r.slide} · ${r.src}_`);
section("Contrast pairs (→ Distinctions)", buckets.contrast, (r) => `- **${r.a}** vs **${r.b}**\n  - ${r.body}\n  - _${r.src}_`);
section("Prose definitions (title = term)", buckets.prose, (r) => `- **${r.term}** — ${r.definition}\n  - _${r.src}_`);
section("Follow-up slides (→ misconceptions)", buckets.followUp, (r) => `- **${r.slide}**\n  - ${r.body}\n  - _${r.src}_`);

console.error(
  `\n[extract] week ${week}: ${buckets.definition.length} bullets, ${buckets.contrast.length} contrasts, ` +
    `${buckets.prose.length} prose, ${buckets.followUp.length} follow-ups — all candidates, curate before use.`,
);
