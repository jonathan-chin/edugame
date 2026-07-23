/**
 * A WebSocket broadcast hub bound to one HTTP server. Messages are one-way
 * (server -> client). On connect, a "hello" callback lets the caller push the current
 * state so a freshly-loaded screen is immediately correct.
 */

import type { Server } from "node:http";
import { type ClientMessage, type ServerMessage, WS_PATH } from "@philosoph/shared";
import { WebSocket, WebSocketServer } from "ws";

export class Hub {
  private readonly wss: WebSocketServer;

  /**
   * @param onHello      messages to push to a freshly-connected client
   * @param onHeartbeat  called with a student's token on each `heartbeat` message, so the
   *                     caller can track who is still connected (student hub only).
   */
  constructor(server: Server, onHello?: () => ServerMessage[], onHeartbeat?: (token: string) => void) {
    this.wss = new WebSocketServer({ server, path: WS_PATH });
    this.wss.on("connection", (socket) => {
      if (onHello) {
        for (const msg of onHello()) this.send(socket, msg);
      }
      if (onHeartbeat) {
        socket.on("message", (data) => {
          let msg: ClientMessage;
          try {
            msg = JSON.parse(data.toString());
          } catch {
            return;
          }
          if (msg.type === "heartbeat" && typeof msg.token === "string") onHeartbeat(msg.token);
        });
      }
    });
  }

  private send(socket: WebSocket, msg: ServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
  }

  broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }
}
