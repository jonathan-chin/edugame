/**
 * A local copy of every question this device has seen, so "My progress" can re-render a past
 * question in full — chart and all — instead of showing a text stub.
 *
 * The server's history payload is text-only on purpose: charts are server-rendered SVG that
 * already arrived inline with the live question, so caching them here costs no extra transfer.
 * The cache is scoped to one session id and dropped the moment a different session appears,
 * which is what keeps a stale question from a previous class out of today's history.
 */

import type { AnswerOption, Content, QuestionInstance } from "@philosoph/shared";

const KEY = "edugame_questions_v1";
/** A chart SVG runs ~4 KB, so this holds a very long session well inside the ~5 MB quota. */
const MAX_BYTES = 2_000_000;

export interface CachedQuestion {
  prompt: Content;
  options: AnswerOption[];
}

interface CacheFile {
  session: string;
  /** Question ids oldest-first — the eviction order when we run out of room. */
  order: string[];
  items: Record<string, CachedQuestion>;
}

function read(): CacheFile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const file = JSON.parse(raw) as CacheFile;
    return file.session && file.items && file.order ? file : null;
  } catch {
    return null; // Unparseable or storage blocked — behave as an empty cache.
  }
}

function write(file: CacheFile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(file));
  } catch {
    // Out of quota: drop the oldest half and try once. If that still fails, give up quietly —
    // history falls back to the server's text, which is a degraded view, not a broken one.
    for (const id of file.order.splice(0, Math.ceil(file.order.length / 2))) delete file.items[id];
    try {
      localStorage.setItem(KEY, JSON.stringify(file));
    } catch {
      /* ignore */
    }
  }
}

/** Remember a question as it goes live. A repeat id is a no-op. */
export function cacheQuestion(session: string, question: QuestionInstance): void {
  if (!session) return;
  const existing = read();
  const file: CacheFile =
    existing && existing.session === session ? existing : { session, order: [], items: {} };
  if (file.items[question.id]) return;
  file.items[question.id] = { prompt: question.prompt, options: question.options ?? [] };
  file.order.push(question.id);
  while (file.order.length > 1 && JSON.stringify(file).length > MAX_BYTES) {
    const oldest = file.order.shift();
    if (oldest) delete file.items[oldest];
  }
  write(file);
}

/**
 * Every cached question for this session, keyed by id. Read once per render rather than
 * per row — each call parses the whole file.
 */
export function readQuestionCache(session: string | null): Record<string, CachedQuestion> {
  if (!session) return {};
  const file = read();
  return file && file.session === session ? file.items : {};
}

export function clearQuestionCache(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
