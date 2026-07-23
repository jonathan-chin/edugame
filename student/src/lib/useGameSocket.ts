/**
 * Subscribes to the server's WebSocket and exposes the latest game state and reveal.
 * Reconnects with a small backoff so a dropped tunnel or sleeping laptop recovers on
 * its own. Same-origin: ws(s)://<this host>/ws.
 */

import type { PublicGameState, RevealInfo, ServerMessage } from "@philosoph/shared";
import { useEffect, useRef, useState } from "react";
import { SESSION_INVALID_EVENT } from "./api";

export interface GameSocket {
  state: PublicGameState | null;
  reveal: RevealInfo | null;
  connected: boolean;
}

/** How often the client tells the server "I'm still here". The server drops a student a few
 *  of these apart (PRESENCE_TIMEOUT_MS in game-service) with no heartbeat. */
const HEARTBEAT_MS = 2000;

export function useGameSocket(token: string | null): GameSocket {
  const [state, setState] = useState<PublicGameState | null>(null);
  const [reveal, setReveal] = useState<RevealInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  // Keep the latest token available to the heartbeat without re-running the connect effect.
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const sendHeartbeat = () => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && tokenRef.current) {
      ws.send(JSON.stringify({ type: "heartbeat", token: tokenRef.current }));
    }
  };

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      socketRef.current = ws;

      ws.onopen = () => {
        retry = 0;
        setConnected(true);
        sendHeartbeat(); // announce presence immediately on (re)connect
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as ServerMessage;
        if (msg.type === "state") {
          setState(msg.state);
          // Drop a stale reveal once a new question opens.
          setReveal((r) => (r && r.questionId === msg.state.question?.id ? r : null));
        } else if (msg.type === "reveal") {
          setReveal(msg.reveal);
        } else if (msg.type === "reset") {
          // The educator ended the game — our token is gone; return to the join screen.
          window.dispatchEvent(new Event(SESSION_INVALID_EVENT));
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
    const heartbeat = setInterval(sendHeartbeat, HEARTBEAT_MS);
    return () => {
      closed = true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Announce presence as soon as a token appears (right after joining) without waiting for
  // the next heartbeat tick.
  useEffect(() => {
    if (token) sendHeartbeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { state, reveal, connected };
}
