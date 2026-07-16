import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./session.js";

/** Express error middleware: translate HttpError into its status, everything else 500. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, reason: err.reason });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal server error" });
}
