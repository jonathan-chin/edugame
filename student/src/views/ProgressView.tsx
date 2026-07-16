/**
 * A student's own progress. Basic view = overall correct/percentage; deeper view =
 * the same broken down by question category and skill. Refetches after each reveal
 * (the reveal's questionId is part of the query key).
 */

import type { StudentProgress } from "@edugame/shared";
import { IonList, IonListHeader, IonSpinner, IonText } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { getProgress } from "../lib/api";

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function Breakdown({ title, rows }: { title: string; rows: StudentProgress["byModule"] }) {
  if (rows.length === 0) return null;
  return (
    <IonList style={{ background: "transparent" }}>
      <IonListHeader>{title}</IonListHeader>
      {rows.map((r) => (
        <div key={r.label} style={{ padding: "6px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>{r.label}</span>
            <span className="caption">
              {r.correct}/{r.answered} · {pct(r.accuracy)}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: pct(r.accuracy) }} />
          </div>
        </div>
      ))}
    </IonList>
  );
}

export function ProgressView({ token, revealSignal }: { token: string; revealSignal: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["progress", token, revealSignal],
    queryFn: () => getProgress(token),
  });

  if (isLoading || !data) {
    return (
      <div className="center" style={{ textAlign: "center" }}>
        <IonSpinner name="dots" />
      </div>
    );
  }

  return (
    <div className="center">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", fontWeight: 700, color: "var(--ion-color-primary)" }}>{pct(data.accuracy)}</div>
        <IonText className="caption">
          {data.correct} correct out of {data.answered} answered
        </IonText>
      </div>
      <Breakdown title="By module" rows={data.byModule} />
      <Breakdown title="By skill" rows={data.bySkill} />
      {data.answered === 0 ? <p className="caption" style={{ textAlign: "center" }}>Answer a question to start tracking your progress.</p> : null}
    </div>
  );
}
