/**
 * Solo study: one learner, one URL, no educator.
 *
 * The question itself is rendered by the very same `PlayView` the classroom uses — that shared
 * path (prompt content, SVG graphics, option widgets, submission, the timer) is the bulk of the
 * client, and duplicating it into a separate app would guarantee it drifts. What is different
 * here is only the shell around it: no join lobby, no "waiting for the teacher", and two
 * controls that mean *check my answer* and *next card*.
 *
 * Those two controls call flow routes that exist only on the solo server. That is what makes it
 * safe to ship this component in the same bundle the classroom serves: rendering it is not what
 * grants the capability — reaching a server that mounts the routes is, and the tunneled student
 * server does not.
 */

import { checkName, SOLO_STUDENT_TOKEN } from "@edugame/shared";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from "@ionic/react";
import { arrowForwardOutline, createOutline, pauseOutline, playOutline, shuffleOutline } from "ionicons/icons";
import { useEffect, useRef, useState } from "react";
import { joinGame, nextQuestion, revealAnswer, setAnswerTimer, skipQuestion } from "./lib/api";
import { readIdentity, writeIdentity } from "./lib/identity";
import { cacheQuestion } from "./lib/questionCache";
import { readSoloSettings, type SoloSettings, writeSoloSettings } from "./lib/soloSettings";
import { useAutoAdvance } from "./lib/useAutoAdvance";
import { useGameSocket } from "./lib/useGameSocket";
import { ModulePicker } from "./views/ModulePicker";
import { PlayView } from "./views/PlayView";
import { ProgressView } from "./views/ProgressView";

type Tab = "study" | "modules" | "progress";

export function SoloApp() {
  // Solo has one seeded participant under a fixed token — no minting, so nothing to go stale and
  // no join required to submit. The name is only the CSV/report label. See `SOLO_STUDENT_TOKEN`.
  const token = SOLO_STUDENT_TOKEN;
  const [name, setName] = useState<string>(() => readIdentity()?.name ?? "");
  // The setup screen is the first thing shown: pick modules + timers, then start. A learner
  // returning mid-session lands back on Study, so this only decides the very first view.
  const [tab, setTab] = useState<Tab>("modules");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<SoloSettings>(readSoloSettings);
  // Whether the learner has drawn their first question yet — flips the setup CTA from
  // "Start studying" to "Done", and is why the Study tab can still show an empty state.
  const [started, setStarted] = useState(false);
  // The after-reveal auto-advance can be paused mid-countdown; reset per question below.
  const [advancePaused, setAdvancePaused] = useState(false);
  const { state, reveal } = useGameSocket(token);

  const question = state?.question ?? null;
  const revealed = !!reveal && reveal.questionId === question?.id;

  // Clear the pick, and unpause auto-advance, whenever a new question opens.
  useEffect(() => {
    setSelected(null);
    setAdvancePaused(false);
  }, [question?.id]);

  // Re-assert the stored name onto the server's seeded participant on load. The token is always
  // valid (seeded), so this isn't recovery — it just restores the CSV/report label after a
  // restart, when the server has re-seeded the default name. Harmless and idempotent.
  useEffect(() => {
    const stored = readIdentity()?.name;
    if (stored) joinGame(stored).catch(() => {});
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same as the classroom: keep a local copy of each question so the progress history can
  // re-render it, graphics included.
  useEffect(() => {
    if (state?.session && state.question) cacheQuestion(state.session, state.question);
  }, [state?.session, state?.question?.id]);

  // Persist the timers so the next study session opens with the same setup.
  useEffect(() => {
    writeSoloSettings(settings);
  }, [settings]);

  const control = async (fn: () => Promise<unknown>, whenEmpty: string): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch {
      // The one failure worth explaining: drawing with no modules ticked (the server's 409).
      setError(whenEmpty);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Draw the next question, applying the answer timer first so it governs the question we're
  // about to open (the server applies a timer change to the next draw).
  const draw = () =>
    control(async () => {
      await setAnswerTimer(settings.answerSeconds);
      await nextQuestion();
      setStarted(true);
    }, "Pick at least one module first.");

  // Change the study-report label. Renames the one seeded participant server-side (same fixed
  // token) and remembers it on this machine. Invalid names are refused with a toast.
  const renameSelf = async (raw: string) => {
    const check = checkName(raw);
    if (!check.ok) {
      setError("That name can't be used — try another.");
      return;
    }
    try {
      const res = await joinGame(check.value);
      writeIdentity({ token: SOLO_STUDENT_TOKEN, name: res.name, session: null });
      setName(res.name);
    } catch {
      setError("Couldn't update your name.");
    }
  };

  // "Done"/"Start studying" on the setup screen. Draw only when we're not already mid-question,
  // so returning to tweak the module list or timers doesn't discard the open card; a changed
  // pool applies to the next draw anyway. Only switch to Study once a question is actually up.
  const startStudying = async () => {
    if (state?.phase === "question") {
      await setAnswerTimer(settings.answerSeconds); // takes effect on the next question
      setTab("study");
      return;
    }
    if (await draw()) setTab("study");
  };

  // After a reveal, count down and draw the next question hands-free (client-side, pausable).
  // Gated two ways:
  //   - only while the Study view is showing, so questions never advance under a learner who
  //     stepped over to Modules;
  //   - only when they actually answered (`selected`). If the answer timer expired with no pick,
  //     the learner may have walked away — auto-advancing there would run the game (and burn any
  //     per-question resources, e.g. a module's generation tokens) unattended and forever. So a
  //     timed-out, unanswered reveal behaves as if auto-advance were off: it waits for a manual
  //     "Next question".
  const autoRemaining = useAutoAdvance({
    active: revealed && selected != null && tab === "study",
    seconds: settings.advanceSeconds,
    paused: advancePaused,
    resetKey: question?.id ?? null,
    onAdvance: () => void draw(),
  });

  // Ask for a name once — it labels the study report. The token is fixed regardless, so this
  // gates only the greeting, not the ability to study.
  if (!name) {
    return <NameGate onNamed={setName} />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ "--background": "var(--card)" } as React.CSSProperties}>
          <IonTitle>
            <EditableName name={name} onRename={renameSelf} />
          </IonTitle>
        </IonToolbar>
        <IonToolbar style={{ "--background": "var(--card)" } as React.CSSProperties}>
          {/* Modules is a peer tab, not a mode toggled from the header: as a hidden mode there
              was no way back to Study, since re-selecting the already-selected segment fires nothing. */}
          <IonSegment value={tab} onIonChange={(e) => setTab((e.detail.value as Tab) ?? "study")}>
            <IonSegmentButton value="study">
              <IonLabel>Study</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="modules">
              <IonLabel>Modules</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="progress">
              <IonLabel>My progress</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {tab === "modules" ? (
          <ModulePicker
            settings={settings}
            onSettings={setSettings}
            onDone={startStudying}
            ctaLabel={started ? "Done" : "Start studying"}
          />
        ) : tab === "progress" ? (
          <ProgressView token={token} revealSignal={reveal?.questionId ?? null} session={state?.session ?? null} />
        ) : !state ? (
          <div className="loading">
            <IonSpinner name="dots" />
            <p className="caption">Starting…</p>
          </div>
        ) : question && state.phase !== "lobby" ? (
          <div className="solo-flow">
            {/* One-shot: tapping an option submits and reveals in a single gesture (revealAnswer
                also stops the answer timer server-side). No "Check answer" step. */}
            <PlayView
              token={token}
              state={state}
              reveal={reveal}
              selected={selected}
              onSelect={setSelected}
              revealOnAnswer
              onAnswered={() => void revealAnswer().catch(() => setError("Couldn't reveal the answer."))}
            />
            <div className="solo-controls">
              {revealed ? (
                <div className="solo-actions">
                  {/* fill is explicit, and the keys differ from the Skip button below, so React
                      mounts a fresh ion-button rather than reusing the outline one — otherwise the
                      fill silently stays stuck at the outline value. */}
                  <IonButton key="next" className="solo-action" fill="solid" disabled={busy} onClick={draw}>
                    <IonIcon slot="start" icon={arrowForwardOutline} />
                    Next question
                  </IonButton>
                  {autoRemaining != null ? (
                    <IonButton key="pause" className="solo-action" fill="outline" onClick={() => setAdvancePaused((p) => !p)}>
                      <IonIcon slot="start" icon={advancePaused ? playOutline : pauseOutline} />
                      {advancePaused ? "Paused" : `Pause · ${autoRemaining}s`}
                    </IonButton>
                  ) : null}
                </div>
              ) : (
                <div className="solo-actions">
                  <IonButton key="skip" className="solo-action" fill="outline" disabled={busy} onClick={() => control(skipQuestion, "Nothing to skip.")}>
                    <IonIcon slot="start" icon={shuffleOutline} />
                    Skip this one
                  </IonButton>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="center" style={{ textAlign: "center", alignItems: "center" }}>
            <IonText>
              <h2>Ready when you are</h2>
              <p className="caption">Choose your modules and timers, then start.</p>
            </IonText>
            <IonButton expand="block" onClick={() => setTab("modules")}>
              Choose modules
            </IonButton>
          </div>
        )}
      </IonContent>

      <IonToast isOpen={!!error} message={error ?? ""} duration={2600} color="warning" onDidDismiss={() => setError(null)} />
    </IonPage>
  );
}

/**
 * The header name, editable in place — click it to rename yourself, like a Google Docs title.
 * Click swaps the text for a field (pre-selected); Enter or blur commits, Escape cancels. The
 * commit relabels the study report (see `renameSelf`); a blank or unchanged value is a no-op.
 */
function EditableName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  // Set true just before an Escape-triggered blur, so the single blur-commit below knows to
  // discard rather than save.
  const escapedRef = useRef(false);

  // Commit is driven off blur — the one path every gesture funnels through: Enter and Escape both
  // blur the field (Escape flags a discard first), and clicking away blurs directly. React's
  // onKeyDown doesn't fire on a native input slotted into Ionic's toolbar shadow DOM, so the keys
  // are caught with a native listener on the element itself, which does.
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    el?.focus();
    el?.select();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el?.blur(); // commit
      } else if (e.key === "Escape") {
        e.preventDefault();
        escapedRef.current = true;
        el?.blur(); // discard
      }
    };
    el?.addEventListener("keydown", onKey);
    return () => el?.removeEventListener("keydown", onKey);
  }, [editing]);

  if (!editing) {
    return (
      <button type="button" className="name-title" title="Click to rename" onClick={() => { setDraft(name); setEditing(true); }}>
        {name}
        <IonIcon icon={createOutline} className="name-title-pencil" aria-hidden="true" />
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    if (escapedRef.current) {
      escapedRef.current = false; // Escape: discard the draft
      return;
    }
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
  };

  return (
    <input
      ref={inputRef}
      className="name-title-input"
      value={draft}
      autoCapitalize="words"
      aria-label="Your name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
    />
  );
}

/**
 * Ask the solo learner what to call them — purely to label their study report. There is no
 * token to obtain here (the solo participant is seeded server-side under a fixed one); "joining"
 * just names that participant. Asked once, then remembered.
 *
 * Intentionally not the classroom `JoinView`: its copy ("join the game") and its privacy notice
 * ("shared with the instructional staff") are both untrue here. Nobody else sees this.
 */
function NameGate({ onNamed }: { onNamed: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const check = checkName(name);
    if (!check.ok) {
      setError("Please enter a name of at least a couple of characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await joinGame(check.value); // names the seeded solo participant server-side
      writeIdentity({ token: res.token, name: res.name, session: null });
      onNamed(res.name);
    } catch {
      setError("Couldn't start. Is the server still running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div className="center" style={{ alignItems: "center" }}>
          <IonText style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: 0 }}>EduGame</h1>
            <p className="caption">Solo study. What should we call you?</p>
          </IonText>
          {/* Carded like the classroom join screen — the app's established way of giving an
              input a surface to sit on, rather than a bare field floating on the background.
              A real <form> so Enter submits: Ionic inputs don't forward onKeyDown. */}
          <IonCard style={{ background: "var(--card)", width: "100%", maxWidth: 360 }}>
            <IonCardContent>
              <form onSubmit={start}>
                <IonInput
                  label="Your name"
                  labelPlacement="stacked"
                  autocapitalize="words"
                  value={name}
                  onIonInput={(e) => setName(e.detail.value ?? "")}
                />
                <IonButton type="submit" expand="block" style={{ marginTop: 16 }} disabled={busy}>
                  {busy ? <IonSpinner name="dots" /> : "Start studying"}
                </IonButton>
              </form>
            </IonCardContent>
          </IonCard>
          <p className="caption" style={{ maxWidth: 320, textAlign: "center" }}>
            Your name only labels your own results on this machine, so a study report can be
            generated for you later.
          </p>
        </div>
        <IonToast isOpen={!!error} message={error ?? ""} duration={2600} color="warning" onDidDismiss={() => setError(null)} />
      </IonContent>
    </IonPage>
  );
}
