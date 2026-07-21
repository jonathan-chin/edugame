/**
 * Discovering and loading recorded sessions from the sessions directory.
 *
 * A session on disk is up to three things (see api's SessionWriter):
 *   - `<id>.csv`       — one row per graded answer
 *   - `<id>.meta.json` — the manifest, including every revealed question
 *   - `<id>/`          — sidecar graphics referenced by the manifest
 *
 * We read the CSV for answers and the manifest for the questions those answers refer to. The
 * CSV column order is imported from `@edugame/shared`, so a schema change there fails the build
 * here rather than silently misaligning columns.
 */

import fs from "node:fs";
import path from "node:path";
import {
  ANSWER_CSV_COLUMNS,
  type AnswerEventRow,
  parseSkillsCell,
  type RecordedQuestion,
  type SessionManifest,
} from "@edugame/shared";

export interface LoadedSession {
  id: string;
  csvPath: string;
  /** Parsed from the manifest's `startedAt`, falling back to the timestamp in the filename. */
  startedAt: Date;
  /** Bytes of the CSV answer log — the honest signal of a real vs. empty/test session. */
  csvBytes: number;
  rows: AnswerEventRow[];
  questions: RecordedQuestion[];
  manifest: SessionManifest | null;
}

/** A one-line description for the interactive picker, without loading the whole session. */
export interface SessionSummary {
  id: string;
  startedAt: Date;
  csvBytes: number;
  answers: number;
  students: number;
}

/** Parse a single CSV line, honoring quoted fields and doubled-quote escaping. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out;
}

function rowFromFields(fields: string[]): AnswerEventRow | null {
  if (fields.length < ANSWER_CSV_COLUMNS.length) return null;
  const get = (col: string) => fields[ANSWER_CSV_COLUMNS.indexOf(col as never)] ?? "";
  const difficulty = Number(get("difficulty"));
  const isCorrect = get("isCorrect") === "1" ? 1 : 0;
  return {
    timestamp: get("timestamp"),
    session: get("session"),
    studentToken: get("studentToken"),
    studentName: get("studentName"),
    questionId: get("questionId"),
    moduleId: get("moduleId"),
    // Positional read: pre-refactor CSVs stored one skill here, which parses as a one-element array.
    skills: parseSkillsCell(get("skills")),
    difficulty: Number.isFinite(difficulty) ? difficulty : 0,
    submission: get("submission"),
    isCorrect,
  };
}

/** Read and parse a CSV's answer rows (the header line is skipped). */
function readRows(csvPath: string): AnswerEventRow[] {
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines
    .slice(1) // header
    .map((l) => rowFromFields(parseCsvLine(l)))
    .filter((r): r is AnswerEventRow => r !== null);
}

/** The instant a session started: manifest `startedAt`, else parsed from the `<...Z>` in the id. */
function startedAtOf(id: string, manifest: SessionManifest | null): Date {
  if (manifest?.startedAt) {
    const d = new Date(manifest.startedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Filename form: session-2026-07-16T10-50-23-014Z  ->  2026-07-16T10:50:23.014Z
  const m = /(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/.exec(id);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`);
  return new Date(0);
}

function readManifest(metaPath: string): SessionManifest | null {
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8")) as SessionManifest;
  } catch {
    return null;
  }
}

/** Every session in `dir`, newest first, as lightweight summaries for the picker. */
export function listSessions(dir: string): SessionSummary[] {
  if (!fs.existsSync(dir)) return [];
  const summaries: SessionSummary[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".csv")) continue;
    const id = file.slice(0, -".csv".length);
    const csvPath = path.join(dir, file);
    const manifest = readManifest(path.join(dir, `${id}.meta.json`));
    const rows = readRows(csvPath);
    summaries.push({
      id,
      startedAt: startedAtOf(id, manifest),
      csvBytes: fs.statSync(csvPath).size,
      answers: rows.length,
      students: new Set(rows.map((r) => r.studentToken)).size,
    });
  }
  return summaries.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/** Fully load the given sessions (by id), for aggregation and rendering. */
export function loadSessions(dir: string, ids: string[]): LoadedSession[] {
  return ids.map((id) => {
    const csvPath = path.join(dir, `${id}.csv`);
    const manifest = readManifest(path.join(dir, `${id}.meta.json`));
    return {
      id,
      csvPath,
      startedAt: startedAtOf(id, manifest),
      csvBytes: fs.statSync(csvPath).size,
      rows: readRows(csvPath),
      questions: manifest?.questions ?? [],
      manifest,
    };
  });
}
