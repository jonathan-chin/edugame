/**
 * Renders a shared `Content` node. Graphics arrive as server-rendered SVG strings and are
 * injected inline (they contain no scripts and come from our own trusted generators, not
 * user input). Inline injection lets the SVG's CSS-variable colors adopt the app theme.
 */

import type { Content } from "@philosoph/shared";

export function ContentView({ content }: { content: Content }) {
  switch (content.kind) {
    case "text":
      return <span style={{ fontWeight: content.emphasis ? 700 : 500 }}>{content.text}</span>;
    case "image":
      return <img src={content.src} alt={content.alt ?? ""} style={{ maxWidth: "100%", borderRadius: 12 }} />;
    case "audio":
      return <audio controls src={content.src} style={{ width: "100%" }} />;
    case "svg":
      return (
        <div className="svg-wrap">
          <div className="svg" dangerouslySetInnerHTML={{ __html: content.svg }} />
          {content.caption ? <p className="caption" style={{ textAlign: "center" }}>{content.caption}</p> : null}
        </div>
      );
    case "composite":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {content.parts.map((p, i) => (
            <ContentView key={i} content={p} />
          ))}
        </div>
      );
  }
}
