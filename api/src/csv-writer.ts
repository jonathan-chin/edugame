/**
 * Session persistence: an append-only CSV of answer events plus a JSON manifest.
 *
 * We append each batch of rows synchronously so a single writer never interleaves, and
 * we never hold the whole file in memory. As raised in COLLABORATION.md, this is not
 * crash-transactional — a hard kill mid-write can lose the last batch — which the human
 * accepted as the intended no-database approach.
 */

import fs from "node:fs";
import path from "node:path";
import { answerRowToCsv, type AnswerEventRow, csvHeaderLine, type SessionManifest } from "@edugame/shared";

export class SessionWriter {
  private readonly csvPath: string;
  private readonly metaPath: string;

  constructor(dir: string, sessionId: string) {
    fs.mkdirSync(dir, { recursive: true });
    this.csvPath = path.join(dir, `${sessionId}.csv`);
    this.metaPath = path.join(dir, `${sessionId}.meta.json`);
    if (!fs.existsSync(this.csvPath)) {
      fs.writeFileSync(this.csvPath, csvHeaderLine() + "\n", "utf8");
    }
  }

  appendRows(rows: AnswerEventRow[]): void {
    if (rows.length === 0) return;
    const text = rows.map(answerRowToCsv).join("\n") + "\n";
    fs.appendFileSync(this.csvPath, text, "utf8");
  }

  writeManifest(manifest: SessionManifest): void {
    fs.writeFileSync(this.metaPath, JSON.stringify(manifest, null, 2), "utf8");
  }

  get paths(): { csv: string; meta: string } {
    return { csv: this.csvPath, meta: this.metaPath };
  }
}
