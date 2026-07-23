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
import {
  type AnswerEventRow,
  type AnswerKey,
  answerRowToCsv,
  type Content,
  csvHeaderLine,
  type QuestionInstance,
  type RecordedContent,
  type RecordedQuestion,
  type SessionManifest,
} from "@philosoph/shared";

/** Keep filenames to a safe, predictable character set. */
const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

export class SessionWriter {
  private readonly sessionId: string;
  private readonly csvPath: string;
  private readonly metaPath: string;
  /** `sessions/<sessionId>/` — created lazily the first time a graphic is externalized. */
  private readonly assetsDir: string;
  private assetsReady = false;

  constructor(dir: string, sessionId: string) {
    fs.mkdirSync(dir, { recursive: true });
    this.sessionId = sessionId;
    this.csvPath = path.join(dir, `${sessionId}.csv`);
    this.metaPath = path.join(dir, `${sessionId}.meta.json`);
    this.assetsDir = path.join(dir, sessionId);
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

  /**
   * Build the recorded form of a question for the manifest: metadata + correct answer inline,
   * graphics written to sidecar files under `sessions/<session>/` and referenced by path.
   */
  recordQuestion(q: QuestionInstance, key: AnswerKey): RecordedQuestion {
    const base = safe(q.id);
    return {
      id: q.id,
      moduleId: q.moduleId,
      skills: q.skills,
      subject: q.subject,
      difficulty: q.difficulty,
      answerFormat: q.answerFormat,
      prompt: this.externalize(q.prompt, `${base}.prompt`),
      options: q.options?.map((o) => ({ id: o.id, content: this.externalize(o.content, `${base}.opt-${safe(o.id)}`) })),
      correct: key,
    };
  }

  get paths(): { csv: string; meta: string } {
    return { csv: this.csvPath, meta: this.metaPath };
  }

  // ---- graphic externalization ----

  private externalize(content: Content, base: string): RecordedContent {
    switch (content.kind) {
      case "text":
        return { kind: "text", text: content.text, emphasis: content.emphasis };
      case "svg":
        return { kind: "svg", path: this.writeAsset(`${base}.svg`, content.svg), caption: content.caption };
      case "image": {
        const asset = this.externalizeDataUri(content.src, base);
        return asset ? { kind: "image", path: asset, alt: content.alt } : { kind: "image", src: content.src, alt: content.alt };
      }
      case "audio": {
        const asset = this.externalizeDataUri(content.src, base);
        return asset ? { kind: "audio", path: asset, label: content.label } : { kind: "audio", src: content.src, label: content.label };
      }
      case "composite":
        return { kind: "composite", parts: content.parts.map((p, i) => this.externalize(p, `${base}.p${i}`)) };
    }
  }

  /** Write a `data:` URI's payload to a sidecar file and return its path; null for other URLs. */
  private externalizeDataUri(src: string, base: string): string | null {
    const m = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(src);
    if (!m) return null;
    const mime = m[1] ?? "application/octet-stream";
    const payload = m[3] ?? "";
    const data = m[2] ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    const ext = safe((mime.split("/")[1] ?? "bin").split("+")[0] ?? "bin") || "bin";
    return this.writeAsset(`${base}.${ext}`, data);
  }

  private writeAsset(filename: string, data: string | Buffer): string {
    if (!this.assetsReady) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
      this.assetsReady = true;
    }
    fs.writeFileSync(path.join(this.assetsDir, filename), data);
    return `${this.sessionId}/${filename}`; // relative to the sessions directory
  }
}
