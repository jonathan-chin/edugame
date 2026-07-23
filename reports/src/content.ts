/**
 * Reading recorded question content.
 *
 * `recordedText` pulls a plain-text label out of a content node (for answer distributions and
 * roster lines). The richer HTML recreation used in the reports lives in `render.ts`, which also
 * inlines the sidecar graphics.
 */

import type { RecordedContent } from "@philosoph/shared";

/** A short readable label for a content node; undefined for a purely graphic node. */
export function recordedText(content: RecordedContent): string | undefined {
  switch (content.kind) {
    case "text":
      return content.text;
    case "svg":
      return content.caption;
    case "image":
      return content.alt;
    case "audio":
      return content.label;
    case "composite": {
      const parts = content.parts.map(recordedText).filter((t): t is string => Boolean(t));
      return parts.length ? parts.join(" ") : undefined;
    }
  }
}
