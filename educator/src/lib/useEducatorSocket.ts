/**
 * Educator WebSocket subscription. Like the student's, but also captures the live
 * analytics snapshot and the current vote tally pushed on the educator channel.
 */

import type { AnalyticsSnapshot, PublicGameState, RevealInfo, ServerMessage, VoteTally } from "@edugame/shared";
import { useEffect, useState } from "react";

export interface EducatorSocket {
  state: PublicGameState | null;
  reveal: RevealInfo | null;
  analytics: AnalyticsSnapshot | null;
  votes: VoteTally | null;
  connected: boolean;
  /** Apply a state received from an HTTP response, so control actions reflect immediately
   *  even if the WebSocket is momentarily disconnected (e.g. just after a server restart). */
  applyState: (state: PublicGameState) => void;
}

export function useEducatorSocket(): EducatorSocket {
  const [state, setState] = useState<PublicGameState | null>(null);
  const [reveal, setReveal] = useState<RevealInfo | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [votes, setVotes] = useState<VoteTally | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/ws`);

      ws.onopen = () => {
        retry = 0;
        setConnected(true);
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as ServerMessage;
        switch (msg.type) {
          case "state":
            setState(msg.state);
            setReveal((r) => (r && r.questionId === msg.state.question?.id ? r : null));
            break;
          case "reveal":
            setReveal(msg.reveal);
            break;
          case "analytics":
            setAnalytics(msg.snapshot);
            break;
          case "votes":
            setVotes(msg.tally);
            break;
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (closed) return;
        retry = Math.min(retry + 1, 6);
        timer = setTimeout(connect, 300 * retry);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
    };
  }, []);

  return { state, reveal, analytics, votes, connected, applyState: setState };
}
