import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import Database from "better-sqlite3";
import { getAllSessions } from "../../db/sessions.js";
import { DATABASE_PATH } from "../../utils/paths.js";
import { initializeSchema } from "../../db/schema.js";
import type { SSEConnectedEvent, SSESessionsEvent, SSEErrorEvent } from "../types.js";

const POLL_INTERVAL = 500;

export async function streamRoute(c: Context) {
  return streamSSE(c, async (stream) => {
    const connectedEvent: SSEConnectedEvent = {
      message: "Connected to session stream",
      timestamp: Date.now(),
    };
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify(connectedEvent),
    });

    let running = true;

    stream.onAbort(() => {
      running = false;
    });

    while (running) {
      let db: Database.Database | null = null;
      try {
        db = new Database(DATABASE_PATH);
        initializeSchema(db);
        const sessions = getAllSessions(db);

        const sessionsEvent: SSESessionsEvent = {
          sessions,
          count: sessions.length,
          timestamp: Date.now(),
        };
        await stream.writeSSE({
          event: "sessions",
          data: JSON.stringify(sessionsEvent),
        });
      } catch {
        const errorEvent: SSEErrorEvent = {
          error: "Database error",
          timestamp: Date.now(),
        };
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify(errorEvent),
        });
      } finally {
        db?.close();
      }

      await stream.sleep(POLL_INTERVAL);
    }
  });
}
