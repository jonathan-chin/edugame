/**
 * Live analytics, updated over the WebSocket as answers are revealed. Includes the
 * drag-to-anonymize toggle so the educator can safely project this panel to the class
 * without exposing real names. Anonymization is display-only — the CSV always keeps the
 * real names.
 */

import type { AnalyticsSnapshot, GroupStat } from "@edugame/shared";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AnonToggle } from "../components/AnonToggle";

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function accuracyColor(a: number) {
  if (a >= 0.75) return "var(--ion-color-success)";
  if (a >= 0.5) return "var(--ion-color-primary)";
  if (a >= 0.25) return "var(--ion-color-warning)";
  return "var(--ion-color-danger)";
}

function GroupChart({ title, rows }: { title: string; rows: GroupStat[] }) {
  const data = rows.map((r) => ({ name: r.label, accuracy: Math.round(r.accuracy * 100), answered: r.answered }));
  return (
    <div className="panel" style={{ flex: 1, minWidth: 280 }}>
      <p style={{ fontWeight: 600, marginTop: 0 }}>{title}</p>
      {data.length === 0 ? (
        <p className="caption">No answers yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 46)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} label={{ position: "right", formatter: (v: number) => `${v}%`, fill: "var(--muted)", fontSize: 11 }}>
              {data.map((d, i) => (
                <Cell key={i} fill={accuracyColor(d.accuracy / 100)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function AnalyticsView({ analytics }: { analytics: AnalyticsSnapshot | null }) {
  const [anon, setAnon] = useState(false);

  // Stable "Student N" numbering derived from the token, independent of the accuracy
  // sort order, so a name doesn't hop numbers as scores change.
  const numbering = useMemo(() => {
    const map = new Map<string, number>();
    if (!analytics) return map;
    [...analytics.students]
      .sort((a, b) => (a.token < b.token ? -1 : 1))
      .forEach((s, i) => map.set(s.token, i + 1));
    return map;
  }, [analytics]);

  if (!analytics) return null;

  return (
    <div className="stack">
      <div className="panel summary">
        <div className="summary-figure">
          <div className="stat">{pct(analytics.overallAccuracy)}</div>
          <p className="caption summary-substats">
            {analytics.totalAnswers} answers · {analytics.students.length} students
          </p>
        </div>
        <div className="summary-toggle">
          <AnonToggle value={anon} onChange={setAnon} />
        </div>
      </div>

      <div className="row" style={{ alignItems: "stretch" }}>
        <GroupChart title="By module" rows={analytics.byModule} />
        <GroupChart title="By skill" rows={analytics.bySkill} />
      </div>

      <div className="panel">
        <p style={{ fontWeight: 600, marginTop: 0 }}>Students</p>
        {analytics.students.length === 0 ? (
          <p className="caption">No one has joined yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analytics.students.map((s) => (
              <div key={s.token} className="row">
                <span style={{ width: 160, fontWeight: 500 }}>{anon ? `Student ${numbering.get(s.token)}` : s.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: pct(s.accuracy), background: accuracyColor(s.accuracy) }} />
                </div>
                <span className="caption" style={{ width: 96, textAlign: "right" }}>
                  {s.correct}/{s.answered} · {pct(s.accuracy)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
