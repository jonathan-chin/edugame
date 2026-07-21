/**
 * The report generator's command line.
 *
 * Flow: list every recorded session (newest first, with a human date and the CSV size so obvious
 * test/empty runs are easy to skip) → pick an inclusive start and end cutoff → build the model →
 * write a whole-class PDF plus one per student into `reports/out/`.
 *
 * `--json` skips rendering and dumps the model, for eyeballing the aggregation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "@inquirer/prompts";
import { buildModel } from "./aggregate.js";
import { humanDate, humanSize, reportDirName, reportFilename } from "./format.js";
import { htmlToPdf, closePdf } from "./pdf.js";
import { classReportHtml, studentReportHtml, type RenderCtx } from "./render.js";
import { listSessions, loadSessions } from "./sessions.js";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");
// `EDUGAME_SESSIONS_DIR` overrides the data location (used by tests and alternate archives).
const SESSIONS_DIR = process.env.EDUGAME_SESSIONS_DIR ?? path.join(ROOT, "sessions");
const OUT_DIR = process.env.EDUGAME_REPORTS_DIR ?? path.join(ROOT, "reports", "out");

async function main() {
  const jsonOnly = process.argv.includes("--json");
  const sessions = listSessions(SESSIONS_DIR);
  if (sessions.length === 0) {
    console.error(`No sessions found in ${SESSIONS_DIR}`);
    process.exit(1);
  }

  // `sessions` is newest-first, so index 0 is the most recent and larger indices are older.
  const choices = sessions.map((s, i) => ({
    name: `${humanDate(s.startedAt).padEnd(34)}  ${humanSize(s.csvBytes).padStart(8)}  ${String(s.answers).padStart(4)} answers · ${s.students} student${s.students === 1 ? "" : "s"}`,
    value: i,
    description: s.id,
  }));

  let lo: number; // index of the most-recent session in range
  let hi: number; // index of the least-recent session in range (hi >= lo)
  if (process.argv.includes("--all")) {
    lo = 0;
    hi = sessions.length - 1;
  } else {
    // Both cutoffs are inclusive and may be the same session (a single-session report).
    lo = await select({ message: "Most recent session to include:", choices, default: 0 });
    hi = await select({
      message: "Back through (least recent to include):",
      choices: choices.filter((c) => c.value >= lo), // only same-or-older than the recent bound
      default: lo,
    });
  }

  const selected = sessions.slice(lo, hi + 1);
  const ids = selected.map((s) => s.id);

  // Progress goes to stderr so `--json` keeps stdout pure for piping.
  console.error(`\nLoading ${ids.length} session${ids.length === 1 ? "" : "s"}…`);
  const loaded = loadSessions(SESSIONS_DIR, ids);
  const model = buildModel(loaded, SESSIONS_DIR);

  if (model.class.answered === 0) {
    console.error("No answers in the selected range — nothing to report.");
    process.exit(1);
  }

  if (jsonOnly) {
    console.log(JSON.stringify(model, (k, v) => (k === "question" ? undefined : v), 2));
    return;
  }

  const ctx: RenderCtx = { sessionsDir: SESSIONS_DIR };
  const start = model.class.startedAt;
  const end = model.class.endedAt;

  // One subdirectory per run, named by the date range, so successive report sets stay separate.
  // Clear it first if it already exists: a re-run (e.g. after editing a nickname map) can change
  // the roster, and a stale per-student PDF from the previous run must not linger beside the new
  // set. Only ever removes this one generated, gitignored folder.
  const runDir = path.join(OUT_DIR, reportDirName(start, end));
  if (fs.existsSync(runDir)) {
    console.log(`Replacing existing reports in reports/out/${reportDirName(start, end)}/`);
    fs.rmSync(runDir, { recursive: true, force: true });
  }
  fs.mkdirSync(runDir, { recursive: true });

  const classFile = path.join(runDir, reportFilename(start, end, null));
  await htmlToPdf(classReportHtml(model.class, ctx), classFile);
  console.log(`  ✓ ${path.basename(classFile)}  (class)`);

  for (const student of model.students) {
    const file = path.join(runDir, reportFilename(start, end, student.name));
    await htmlToPdf(studentReportHtml(student, model.class, ctx), file);
    console.log(`  ✓ ${path.basename(file)}`);
  }

  await closePdf();
  console.log(`\nDone. ${model.students.length + 1} report${model.students.length === 0 ? "" : "s"} in reports/out/${reportDirName(start, end)}/`);
}

main().catch(async (err) => {
  await closePdf();
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
