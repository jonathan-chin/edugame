import { IonAlert, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonSpinner, IonTitle, IonToolbar } from "@ionic/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logOutOutline } from "ionicons/icons";
import { useState } from "react";
import { resetGame } from "./lib/api";
import { useEducatorSocket } from "./lib/useEducatorSocket";
import { AnalyticsView } from "./views/AnalyticsView";
import { ControlView } from "./views/ControlView";
import { ProjectorView } from "./views/ProjectorView";

/**
 * Lightweight path-based routing (no router dependency). The educator server serves this
 * bundle for any non-/api path, so `/projector` loads the app and we render the projector
 * page; everything else renders the combined control + analytics dashboard.
 */
export function App() {
  if (window.location.pathname.startsWith("/projector")) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar style={{ "--background": "var(--card)" } as React.CSSProperties}>
            <IonTitle>EduGame · Projector</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <ProjectorView />
        </IonContent>
      </IonPage>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const { state, reveal, analytics, votes, applyState } = useEducatorSocket();
  const queryClient = useQueryClient();
  // A single inline indicator while the initial state loads over the socket. Once loaded,
  // `state`/`analytics` stay set, so a later mid-game reconnect never re-triggers it (and
  // control actions still work over HTTP regardless).
  const loading = !state || !analytics;
  const [confirmReset, setConfirmReset] = useState(false);

  // Log out: end the game, log out every student, and start a fresh session. Apply the
  // returned lobby state immediately and re-fetch the module pool (a new session resets it).
  const resetMut = useMutation({
    mutationFn: resetGame,
    onSuccess: (s) => {
      applyState(s);
      queryClient.invalidateQueries({ queryKey: ["pool"] });
    },
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ "--background": "var(--card)" } as React.CSSProperties}>
          <IonTitle>EduGame · Educator</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setConfirmReset(true)} disabled={loading || resetMut.isPending} aria-label="Log out">
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonAlert
        isOpen={confirmReset}
        onDidDismiss={() => setConfirmReset(false)}
        header="End game & log out?"
        message="This ends the current game, logs out all students, and starts a new session. Results so far are already saved."
        buttons={[
          { text: "Cancel", role: "cancel" },
          { text: "End & reset", role: "destructive", handler: () => resetMut.mutate() },
        ]}
      />
      <IonContent>
        {loading ? (
          <div className="loading">
            <IonSpinner name="dots" />
            <p className="caption">Connecting…</p>
          </div>
        ) : (
          <div className="dashboard">
            <div className="panel column">
              <ControlView state={state} reveal={reveal} votes={votes} onState={applyState} />
            </div>
            <div className="panel column">
              <AnalyticsView analytics={analytics} />
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
