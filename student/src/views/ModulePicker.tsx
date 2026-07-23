/**
 * The solo study setup screen: which question modules to draw from, and the two timers.
 *
 * This is the first thing a solo learner sees after naming themselves, and its CTA starts the
 * session — so it carries the settings too (there is nowhere else in the flow to put them). The
 * session starts with an empty pool and refuses to draw from nothing, so picking at least one
 * module here is how studying begins, not optional chrome. Deliberately much plainer than the
 * educator's picker: no live roster, no anonymize toggle.
 */

import type { ModuleInfo } from "@edugame/shared";
import {
  IonButton,
  IonCheckbox,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getModules, getPool, setPool } from "../lib/api";
import { ADVANCE_SECONDS_PRESETS, ANSWER_SECONDS_PRESETS, type SoloSettings } from "../lib/soloSettings";

/** One segmented row of second-presets; 0 renders as "Off". */
function SecondsPicker({
  value,
  presets,
  onChange,
}: {
  value: number;
  presets: readonly number[];
  onChange: (seconds: number) => void;
}) {
  return (
    <IonSegment value={String(value)} onIonChange={(e) => onChange(Number(e.detail.value ?? 0))}>
      {presets.map((s) => (
        <IonSegmentButton key={s} value={String(s)}>
          <IonLabel>{s === 0 ? "Off" : `${s}s`}</IonLabel>
        </IonSegmentButton>
      ))}
    </IonSegment>
  );
}

export function ModulePicker({
  settings,
  onSettings,
  onDone,
  ctaLabel,
}: {
  settings: SoloSettings;
  onSettings: (s: SoloSettings) => void;
  onDone?: () => void;
  /** Text for the start button — "Start studying" the first time, "Done" when returning. */
  ctaLabel: string;
}) {
  const qc = useQueryClient();
  const modules = useQuery({ queryKey: ["modules"], queryFn: getModules });
  const pool = useQuery({ queryKey: ["pool"], queryFn: getPool });

  const save = useMutation({
    mutationFn: setPool,
    // The server is the source of truth for the pool (it drops ids it doesn't recognise), so
    // take its answer rather than assuming ours stuck.
    onSuccess: (res) => qc.setQueryData(["pool"], res),
  });

  if (modules.isLoading || pool.isLoading) {
    return (
      <div className="center" style={{ alignItems: "center" }}>
        <IonSpinner name="dots" />
      </div>
    );
  }

  const selected = new Set(save.variables ?? pool.data?.moduleIds ?? []);
  const toggle = (m: ModuleInfo) => {
    const next = new Set(selected);
    if (next.has(m.id)) next.delete(m.id);
    else next.add(m.id);
    save.mutate([...next]);
  };

  return (
    <div className="center">
      <IonText>
        <h2 style={{ marginBottom: 4 }}>Modules</h2>
        <p className="caption">Questions are drawn at random from whatever you tick.</p>
      </IonText>

      <IonList style={{ background: "transparent" }}>
        {modules.data?.map((m) => (
          <IonItem key={m.id} lines="full" style={{ "--background": "var(--card)" } as React.CSSProperties}>
            <IonCheckbox checked={selected.has(m.id)} onIonChange={() => toggle(m)} labelPlacement="end" justify="start">
              <IonLabel>
                <div>{m.title}</div>
                <div className="caption" style={{ whiteSpace: "normal" }}>
                  {m.description}
                </div>
              </IonLabel>
            </IonCheckbox>
          </IonItem>
        ))}
      </IonList>

      <div className="solo-settings">
        <div className="solo-setting">
          <div className="setting-head">Time to answer</div>
          <div className="caption">The card locks and reveals itself when this runs out.</div>
          <SecondsPicker
            value={settings.answerSeconds}
            presets={ANSWER_SECONDS_PRESETS}
            onChange={(answerSeconds) => onSettings({ ...settings, answerSeconds })}
          />
        </div>
        <div className="solo-setting">
          <div className="setting-head">Auto-advance after answer</div>
          <div className="caption">Draws the next card on its own once the answer shows — pausable while it counts down.</div>
          <SecondsPicker
            value={settings.advanceSeconds}
            presets={ADVANCE_SECONDS_PRESETS}
            onChange={(advanceSeconds) => onSettings({ ...settings, advanceSeconds })}
          />
        </div>
      </div>

      {onDone ? (
        <IonButton className="solo-start" expand="block" disabled={selected.size === 0} onClick={onDone}>
          {selected.size === 0 ? "Pick at least one module" : ctaLabel}
        </IonButton>
      ) : null}
    </div>
  );
}
