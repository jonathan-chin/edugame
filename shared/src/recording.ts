/**
 * Session recording: a self-describing snapshot of each question put to the class, embedded
 * in the manifest (`<session>.meta.json`).
 *
 * Graphics are the awkward part — an SVG or image is bulky and not JSON-friendly — so they are
 * written to **sidecar files** under `sessions/<session>/` and referenced here by `path`
 * (relative to the sessions directory). Everything else (text, the correct answer) is inline.
 *
 * This makes a session self-describing without re-running the generator: even if a future
 * module generates non-deterministically (so the RNG seed can't reproduce it), the exact
 * question and answer are captured at reveal time.
 */

import type { AnswerFormat, AnswerKey } from "./question.js";

/**
 * A `Content` node as recorded in the manifest. An `svg` graphic (and any `image`/`audio`
 * carried as a `data:` URI) is externalized to a sidecar file and referenced by `path`;
 * `http(s)` media keeps its `src`; text stays inline.
 */
export type RecordedContent =
  | { kind: "text"; text: string; emphasis?: boolean }
  | { kind: "image"; src?: string; path?: string; alt?: string }
  | { kind: "audio"; src?: string; path?: string; label?: string }
  | { kind: "svg"; path: string; caption?: string }
  | { kind: "composite"; parts: RecordedContent[] };

export interface RecordedQuestion {
  id: string;
  moduleId: string;
  skill: string;
  difficulty: number;
  answerFormat: AnswerFormat;
  prompt: RecordedContent;
  options?: { id: string; content: RecordedContent }[];
  valueUnit?: string;
  /** The correct answer — disclosed in the record (the live `QuestionInstance` never is). */
  correct: AnswerKey;
}
