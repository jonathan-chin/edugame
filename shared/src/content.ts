/**
 * The content model.
 *
 * A question's prompt and each answer option are described as `Content`, a small tagged
 * union that a client knows how to render. Charts are delivered as **server-rendered SVG
 * strings** (`kind: "svg"`): the module produces the finished graphic, and the client
 * just drops it into the DOM. This keeps clients free of any charting library and lets a
 * new module invent any visual it likes without the client needing to understand it.
 *
 * The SVG uses CSS custom properties for its colors, so it still adopts each client's
 * theme when injected inline.
 */

export type Content =
  | { kind: "text"; text: string; emphasis?: boolean }
  | { kind: "image"; src: string; alt?: string }
  | { kind: "audio"; src: string; label?: string }
  | { kind: "svg"; svg: string; caption?: string }
  | { kind: "composite"; parts: Content[] };

/** Convenience constructor for the common text case. */
export function text(s: string, emphasis = false): Content {
  return { kind: "text", text: s, emphasis };
}

/** Convenience constructor for a server-rendered SVG graphic. */
export function svg(markup: string, caption?: string): Content {
  return { kind: "svg", svg: markup, caption };
}
