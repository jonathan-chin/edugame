import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { logOutOutline } from "ionicons/icons";
import { useEffect, useState } from "react";
import { getProgress, leaveGame, SESSION_INVALID_EVENT } from "./lib/api";
import { cacheQuestion, clearQuestionCache } from "./lib/questionCache";
import { useGameSocket } from "./lib/useGameSocket";
import { JoinView } from "./views/JoinView";
import { PlayView } from "./views/PlayView";
import { ProgressView } from "./views/ProgressView";

/**
 * Session-scoped storage (not localStorage): a token survives an accidental in-tab reload
 * but is gone once the tab closes, so each class starts with a fresh join. The server keeps
 * sessions in memory only, so a longer-lived token would just go stale on restart anyway —
 * which the SESSION_INVALID_EVENT handler below recovers from.
 */
const TOKEN_KEY = "student_token";
const NAME_KEY = "student_name";

export function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [name, setName] = useState<string>(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [tab, setTab] = useState<"play" | "progress">("play");
  const { state, reveal } = useGameSocket(token);
  // The current answer pick lives here, above PlayView, so it survives switching to the
  // "My progress" tab and back (PlayView unmounts on that switch). Resets per question below.
  const [selected, setSelected] = useState<string | null>(null);
  // A single inline indicator while the first game state loads over the socket (mirrors the
  // educator app). Once loaded, `state` stays set, so a later mid-game reconnect won't
  // re-trigger it.
  const loading = state === null;

  const onJoined = (t: string, n: string) => {
    sessionStorage.setItem(TOKEN_KEY, t);
    sessionStorage.setItem(NAME_KEY, n);
    setToken(t);
    setName(n);
  };

  // Log out: drop our stored session and return to the join screen, and tell the server to
  // release the token/name (fire-and-forget — the UI shouldn't wait on it).
  const onLogout = () => {
    const t = token;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(NAME_KEY);
    clearQuestionCache();
    setToken(null);
    if (t) leaveGame(t).catch(() => {});
  };

  // If the server rejects our token (it restarted / lost the session), return to join.
  useEffect(() => {
    const onInvalid = () => {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(NAME_KEY);
      setToken(null);
    };
    window.addEventListener(SESSION_INVALID_EVENT, onInvalid);
    return () => window.removeEventListener(SESSION_INVALID_EVENT, onInvalid);
  }, []);

  // Validate a restored token on load so a stale one bounces to join immediately (a 401
  // fires SESSION_INVALID_EVENT) rather than waiting for the first answer to fail.
  useEffect(() => {
    if (token) getProgress(token).catch(() => {});
    // Intentionally runs once for the initially-restored token only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear the pick whenever a new question opens (skip/next/reveal→next all change the id).
  useEffect(() => {
    setSelected(null);
  }, [state?.question?.id]);

  // Keep a local copy of each question as it goes live so "My progress" can re-render it —
  // charts included — in the history. Lives here, not in PlayView, because PlayView unmounts
  // whenever the student is looking at their progress.
  useEffect(() => {
    if (state?.session && state.question) cacheQuestion(state.session, state.question);
  }, [state?.session, state?.question?.id]);

  if (!token) {
    return (
      <IonPage>
        <IonContent>
          <JoinView onJoined={onJoined} />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ "--background": "var(--card)" } as React.CSSProperties}>
          <IonTitle>{name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onLogout} aria-label="Log out">
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar style={{ "--background": "var(--card)" } as React.CSSProperties}>
          <IonSegment value={tab} onIonChange={(e) => setTab((e.detail.value as "play" | "progress") ?? "play")}>
            <IonSegmentButton value="play">
              <IonLabel>Play</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="progress">
              <IonLabel>My progress</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {loading ? (
          <div className="loading">
            <IonSpinner name="dots" />
            <p className="caption">Connecting…</p>
          </div>
        ) : tab === "play" ? (
          <PlayView token={token} state={state} reveal={reveal} selected={selected} onSelect={setSelected} />
        ) : (
          <ProgressView
            token={token}
            revealSignal={reveal?.questionId ?? null}
            session={state?.session ?? null}
          />
        )}
      </IonContent>
    </IonPage>
  );
}
