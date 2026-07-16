/**
 * Drag-to-confirm toggle for anonymizing student names.
 *
 * Per the design: this must be *dragged* left/right, not clicked, so a stray click can
 * never accidentally reveal real names to the class. The knob only flips state if it is
 * dragged past the midpoint; a click without a drag snaps back to where it was.
 */

import { useRef, useState } from "react";

const MIN_X = 4;
const MAX_X = 180; // track 220 - knob 36 - 4
const MID = (MIN_X + MAX_X) / 2;

export function AnonToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState<number | null>(null);

  const knobLeft = dragX ?? (value ? MAX_X : MIN_X);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragX(knobLeft);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragX === null || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 18; // center knob on the pointer
    setDragX(Math.max(MIN_X, Math.min(MAX_X, x)));
  };

  const onPointerUp = () => {
    if (dragX === null) return;
    const next = dragX > MID;
    setDragX(null);
    if (next !== value) onChange(next);
  };

  // While dragging, reflect where the knob currently is so the labels/track preview the
  // state you'd land on; otherwise reflect the committed value.
  const liveOn = dragX !== null ? dragX > MID : value;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={`anon-side${!liveOn ? " active" : ""}`}>Names</span>
        <div
          ref={trackRef}
          className={`anon${liveOn ? " on" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="anon-knob" style={{ left: knobLeft, transition: dragX === null ? "left 0.18s ease" : "none" }} />
        </div>
        <span className={`anon-side${liveOn ? " active" : ""}`}>Hidden</span>
      </div>
      <p className="caption" style={{ fontSize: "0.8rem", width: "100%" }}>
        {value ? "Names hidden — safe to show the class. Drag left to reveal." : "Real names shown. Drag right to anonymize before projecting."}
      </p>
    </div>
  );
}
