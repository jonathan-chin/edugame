/**
 * Projector screen. Shown on the class display: the current question (prompt, options, and
 * countdown) as a *reference* — it is deliberately not interactive — plus the public join
 * link + QR so students can scan to join. When the educator reveals, the correct option is
 * highlighted here too.
 */

import { IonButton, IonIcon, IonSpinner } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { checkmarkCircle, refreshOutline, timerOutline } from "ionicons/icons";
import { getLink } from "../lib/api";
import { ContentView } from "../lib/ContentView";
import { useCountdown } from "../lib/useCountdown";
import { useEducatorSocket } from "../lib/useEducatorSocket";

export function ProjectorView() {
  const link = useQuery({ queryKey: ["link"], queryFn: getLink, refetchInterval: 5000 });
  const { state, reveal } = useEducatorSocket();
  const question = state?.question ?? null;
  const revealed = !!reveal && reveal.questionId === question?.id;
  const remaining = useCountdown(state?.questionEndsAt ?? null, state?.serverNow);

  return (
    <div className="wrap">
      {question ? (
        <div className="panel">
          {remaining != null && !revealed ? (
            <div className={`timer${remaining <= 5 ? " urgent" : ""}`} style={{ marginBottom: 12 }}>
              <IonIcon icon={timerOutline} />
              <span className="timer-count">{remaining}s</span>
              <span className="caption">until the answer is revealed</span>
            </div>
          ) : null}

          <div style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: 16 }}>
            <ContentView content={question.prompt} />
          </div>

          <div className="answer-grid">
            {question.options?.map((opt, i) => {
              const isCorrect = revealed && reveal?.correctOptionId === opt.id;
              return (
                <div
                  key={opt.id}
                  style={{
                    border: isCorrect ? "2px solid var(--ion-color-success)" : "2px solid transparent",
                    background: isCorrect ? "rgba(47, 191, 113, 0.12)" : "transparent",
                    borderRadius: 12,
                    padding: 8,
                  }}
                >
                  <div className="row">
                    {isCorrect ? <IonIcon icon={checkmarkCircle} color="success" /> : null}
                    <span style={{ fontWeight: 600 }}>Option {i + 1}</span>
                  </div>
                  <ContentView content={opt.content} />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="panel" style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginTop: 0 }}>Student join link</p>
        {link.isLoading ? (
          <IonSpinner name="dots" />
        ) : link.data?.publicUrl ? (
          <>
            {link.data.qrDataUrl ? (
              <img src={link.data.qrDataUrl} alt="Join QR" style={{ width: 240, borderRadius: 12 }} />
            ) : null}
            <p style={{ wordBreak: "break-all", fontSize: "1.1rem" }}>{link.data.publicUrl}</p>
          </>
        ) : (
          <>
            <p className="caption">No public tunnel detected yet.</p>
            <IonButton fill="clear" onClick={() => link.refetch()}>
              <IonIcon slot="start" icon={refreshOutline} />
              Check again
            </IonButton>
            <p className="caption">
              The orchestrator pushes the ngrok URL here once the tunnel is up. If you launched the API without a tunnel, students on the same network can use your LAN address.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
