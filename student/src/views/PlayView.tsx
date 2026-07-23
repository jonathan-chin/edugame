/**
 * The core student experience: see the shared question, pick an answer, then see whether you
 * were right. Submissions go over HTTP (TanStack Query mutation); the WebSocket pushes the
 * shared state and the reveal.
 *
 * Two modes, one component. In a classroom you can change your pick freely until the educator
 * reveals — everyone answers on the same clock. Solo study is one-shot (`revealOnAnswer`): the
 * first tap is your answer, and it reveals immediately (the parent handles the reveal via
 * `onAnswered`, which also stops the timer). No take-backs, because there's no one to wait for.
 */

import type { PublicGameState, RevealInfo } from "@edugame/shared";
import { IonButton, IonSpinner, IonText, IonToast } from "@ionic/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { submitAnswer } from "../lib/api";
import { ContentView } from "../lib/ContentView";
import { useCountdown } from "../lib/useCountdown";

export function PlayView({
  token,
  state,
  reveal,
  selected,
  onSelect,
  revealOnAnswer = false,
  onAnswered,
}: {
  token: string;
  state: PublicGameState | null;
  reveal: RevealInfo | null;
  /** The student's current pick, held in the parent so it survives a tab switch (it lives
   *  above PlayView, which unmounts when the "My progress" tab is shown). */
  selected: string | null;
  onSelect: (optionId: string | null) => void;
  /** One-shot solo mode: the first tap commits and reveals; the answer can't be changed. */
  revealOnAnswer?: boolean;
  /** Called after a successful one-shot submission, so the parent can reveal (and stop the timer). */
  onAnswered?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const question = state?.question ?? null;
  const locked = state?.locked ?? false;
  const revealed = !!reveal && reveal.questionId === question?.id;
  const remaining = useCountdown(state?.questionEndsAt ?? null, state?.serverNow);
  const showTimer = remaining != null && !revealed;

  const mutation = useMutation({
    mutationFn: (optionId: string) => submitAnswer(token, { optionId }),
    onSuccess: () => {
      if (revealOnAnswer) onAnswered?.(); // commit → reveal, one gesture
    },
    onError: () => {
      setError("Couldn't submit — the answer may be locked.");
      if (revealOnAnswer) onSelect(null); // clear the frozen pick so a retry is possible
    },
  });

  if (!question || state?.phase === "lobby") {
    return (
      <div className="center" style={{ textAlign: "center", alignItems: "center" }}>
        <IonSpinner name="dots" />
        <IonText>
          <h2>Waiting for the teacher…</h2>
          <p className="caption">{state ? `${state.studentCount} joined` : ""}</p>
        </IonText>
      </div>
    );
  }

  const pick = (optionId: string) => {
    if (locked) return;
    // One-shot: once a pick is made it's final (a reveal is on its way). Clearing on error
    // above re-opens this. In classroom mode there's no freeze — you can change until reveal.
    if (revealOnAnswer && selected != null) return;
    onSelect(optionId);
    mutation.mutate(optionId);
  };

  const optionClass = (optionId: string) => {
    const classes = ["option"];
    if (revealed) {
      if (optionId === reveal?.correctOptionId) classes.push("correct");
      else if (optionId === selected) classes.push("incorrect");
    } else if (optionId === selected) {
      classes.push("selected");
    }
    return classes.join(" ");
  };

  // Status line under the options. Empty while answering (no "tap your answer" prompt), so the
  // caption and the timer swap in the same spot on reveal rather than shoving the question around.
  const caption = revealed
    ? selected === reveal?.correctOptionId
      ? "✅ Correct!"
      : selected
        ? "❌ Not this time."
        : "Answer revealed."
    : locked
      ? "Answers are locked."
      : selected
        ? revealOnAnswer
          ? "Checking…"
          : "Answer saved — you can still change it."
        : "";

  return (
    <div className="center">
      <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        <ContentView content={question.prompt} />
      </div>

      <div className="options">
        {question.options?.map((opt) => (
          <IonButton
            key={opt.id}
            className={optionClass(opt.id)}
            fill="clear"
            disabled={locked && !revealed}
            onClick={() => pick(opt.id)}
          >
            <div style={{ padding: 8, width: "100%" }}>
              <ContentView content={opt.content} />
            </div>
          </IonButton>
        ))}
      </div>

      {/* Timer lives below the options so it doesn't push them down when it appears/disappears. */}
      {showTimer ? (
        <div className={`timer${remaining <= 5 ? " urgent" : ""}`}>
          <span className="timer-count">{remaining}s</span>
          <div className="timer-track">
            <div
              className="timer-fill"
              style={{ width: `${state?.timerSeconds ? (remaining / state.timerSeconds) * 100 : 0}%` }}
            />
          </div>
        </div>
      ) : caption ? (
        <IonText className="caption" style={{ textAlign: "center" }}>
          {caption}
        </IonText>
      ) : null}

      <IonToast isOpen={!!error} message={error ?? ""} duration={2000} color="danger" onDidDismiss={() => setError(null)} />
    </div>
  );
}
