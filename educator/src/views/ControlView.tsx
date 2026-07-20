/**
 * The educator's flow-control column (left side of the dashboard): a link to the projector
 * page, the module pool picker, the Start/Next and Reveal controls, and a live preview of
 * the current question with its vote distribution.
 */

import type { PublicGameState, RevealInfo, VoteTally } from "@edugame/shared";
import { IonButton, IonIcon, IonInput, IonSpinner } from "@ionic/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkmarkCircle, eyeOutline, layersOutline, openOutline, playForwardOutline, playSkipForwardOutline, timerOutline } from "ionicons/icons";
import { useEffect, useState } from "react";
import { ModulePickerModal } from "../components/ModulePickerModal";
import { getModules, getPool, nextQuestion, revealAnswer, setPool, setTimer, skipQuestion } from "../lib/api";
import { ContentView } from "../lib/ContentView";
import { useCountdown } from "../lib/useCountdown";

export function ControlView({
  state,
  reveal,
  votes,
  onState,
}: {
  state: PublicGameState | null;
  reveal: RevealInfo | null;
  votes: VoteTally | null;
  onState: (state: PublicGameState) => void;
}) {
  const queryClient = useQueryClient();
  const modules = useQuery({ queryKey: ["modules"], queryFn: getModules });
  const pool = useQuery({ queryKey: ["pool"], queryFn: getPool });
  const [pickerOpen, setPickerOpen] = useState(false);

  // Each control action returns the new game state; apply it directly so the view updates
  // instantly and even if the WebSocket is momentarily down (e.g. right after a restart).
  const next = useMutation({ mutationFn: () => nextQuestion(), onSuccess: onState });
  const skip = useMutation({ mutationFn: skipQuestion, onSuccess: onState });
  const revealMut = useMutation({ mutationFn: revealAnswer, onSuccess: onState });
  const poolMut = useMutation({
    mutationFn: setPool,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pool"] }),
  });
  const timerMut = useMutation({ mutationFn: setTimer });

  const question = state?.question ?? null;
  const revealed = !!reveal && reveal.questionId === question?.id;
  const started = (state?.questionNumber ?? 0) > 0;
  const inQuestion = state?.phase === "question";
  const remaining = useCountdown(state?.questionEndsAt ?? null, state?.serverNow);

  // Local draft for the timer field, seeded from the server value but left alone while the
  // educator is editing so an incoming state broadcast never clobbers what they're typing.
  const [timerText, setTimerText] = useState("");
  const [timerFocused, setTimerFocused] = useState(false);
  // Reflect the server's value only when it actually changes (and we're not mid-edit). Keying
  // this on focus too would reset the field to the pre-commit value on blur, before the
  // server has echoed the new one back — the flicker that made blur look like it did nothing.
  useEffect(() => {
    if (!timerFocused) setTimerText(String(state?.timerSeconds ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.timerSeconds]);
  // Save the entered value. `ion-input` emits ionChange on blur (and Enter), so the setting is
  // committed when the field loses focus — no need to press Enter. Uses the event's value
  // directly rather than the timerText state to avoid any stale-closure race.
  const commitTimer = (raw: string | null | undefined) => {
    const n = Math.max(0, Math.min(3600, Math.floor(Number(raw) || 0)));
    setTimerText(String(n));
    timerMut.mutate(n);
  };
  const busy = next.isPending || skip.isPending || revealMut.isPending;
  const selectedIds = pool.data?.moduleIds ?? [];
  const noModules = selectedIds.length === 0; // can't start or draw a question without a module
  const voteFor = (optionId: string) => (votes?.questionId === question?.id ? (votes?.counts[optionId] ?? 0) : 0);
  const voteTotal = votes && votes.questionId === question?.id ? votes.total : 0;
  const statusText = state
    ? `${state.phase.charAt(0).toUpperCase() + state.phase.slice(1)}${started ? ` · Q${state.questionNumber}` : ""} · ${state.answeredCount}/${state.studentCount} answered`
    : "";

  return (
    <div className="stack">
      <div className="row" style={{ gap: 12, flexWrap: "nowrap", alignItems: "center" }}>
        <a className="projector-link" href="/projector" target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0 }}>
          <IonIcon icon={openOutline} />
          Open projector view
        </a>
        <div style={{ flex: 1 }}>
          <IonButton fill="outline" expand="block" onClick={() => setPickerOpen(true)}>
            <IonIcon slot="start" icon={layersOutline} />
            Modules · {selectedIds.length}
          </IonButton>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ gap: 12, flexWrap: "nowrap", alignItems: "center" }}>
          <span className="caption" style={{ flex: 1, minWidth: 0 }}>
            {statusText}
          </span>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            {inQuestion ? (
              remaining != null ? (
                <div className={`timer${remaining <= 5 ? " urgent" : ""}`}>
                  <IonIcon icon={timerOutline} />
                  <span className="timer-count">{remaining}s</span>
                  <span className="caption">until auto-reveal</span>
                </div>
              ) : null
            ) : (
              <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                <IonIcon icon={timerOutline} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <span className="caption" style={{ flexShrink: 0 }}>
                  Auto-reveal
                </span>
                <IonInput
                  type="number"
                  inputmode="numeric"
                  min={0}
                  max={3600}
                  value={timerText}
                  className="timer-input"
                  style={{ maxWidth: 64 }}
                  onIonFocus={() => setTimerFocused(true)}
                  onIonInput={(e) => setTimerText(e.detail.value ?? "")}
                  onIonBlur={() => setTimerFocused(false)}
                  onIonChange={(e) => commitTimer(e.detail.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).blur()}
                />
                <span className="caption" style={{ flexShrink: 0 }}>{Number(timerText) > 0 ? "sec" : "off"}</span>
              </div>
            )}
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          {!started ? (
            <IonButton onClick={() => next.mutate()} disabled={busy || noModules}>
              <IonIcon slot="start" icon={playForwardOutline} />
              Start game
            </IonButton>
          ) : inQuestion ? (
            <>
              <IonButton fill="outline" onClick={() => skip.mutate()} disabled={busy || noModules}>
                <IonIcon slot="start" icon={playSkipForwardOutline} />
                Skip question
              </IonButton>
              <IonButton
                color="warning"
                fill="outline"
                style={{ marginLeft: "auto" }}
                onClick={() => revealMut.mutate()}
                disabled={busy}
              >
                <IonIcon slot="start" icon={eyeOutline} />
                Reveal answer
              </IonButton>
            </>
          ) : (
            <IonButton style={{ marginLeft: "auto" }} onClick={() => next.mutate()} disabled={busy || noModules}>
              <IonIcon slot="start" icon={playForwardOutline} />
              Next question
            </IonButton>
          )}
          {busy ? <IonSpinner name="dots" /> : null}
        </div>

        {noModules ? (
          <p className="caption" style={{ marginTop: 10 }}>
            Select at least one module to start.
          </p>
        ) : null}
      </div>

      {question ? (
        <div className="panel">
          <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>
            <ContentView content={question.prompt} />
          </div>
          <div className="answer-grid">
            {question.options?.map((opt, i) => {
              const count = voteFor(opt.id);
              const pct = voteTotal ? Math.round((count / voteTotal) * 100) : 0;
              const isCorrect = revealed && reveal?.correctOptionId === opt.id;
              return (
                <div
                  key={opt.id}
                  style={{ border: isCorrect ? "2px solid var(--ion-color-success)" : "2px solid transparent", borderRadius: 12, padding: 8 }}
                >
                  <div className="row">
                    {isCorrect ? <IonIcon icon={checkmarkCircle} color="success" /> : null}
                    <span style={{ fontWeight: 600 }}>Option {i + 1}</span>
                    <span className="caption">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="vote-track" style={{ margin: "6px 0" }}>
                    <div className="vote-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <ContentView content={opt.content} />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="panel">
          <p className="caption">Pick your modules, then press “Start game”. Students who have joined will see the question appear instantly.</p>
        </div>
      )}

      <ModulePickerModal
        isOpen={pickerOpen}
        modules={modules.data ?? []}
        selected={selectedIds}
        onClose={() => setPickerOpen(false)}
        onApply={(ids) => poolMut.mutate(ids)}
      />
    </div>
  );
}
