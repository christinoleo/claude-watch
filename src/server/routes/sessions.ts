import { Hono } from "hono";
import Database from "better-sqlite3";
import { getAllSessions, getSession } from "../../db/sessions.js";
import { DATABASE_PATH } from "../../utils/paths.js";
import { initializeSchema } from "../../db/schema.js";
import { capturePaneContent, isPaneShowingWorking, getPaneTitle } from "../../tmux/pane.js";
import type { SessionsResponse, SessionResponse, ErrorResponse } from "../types.js";

export const sessionsRoutes = new Hono();

function getDb(): Database.Database {
  const db = new Database(DATABASE_PATH);
  initializeSchema(db);
  return db;
}

// Sync session state with actual tmux pane content
function syncSessionStates(db: Database.Database): void {
  const sessionsWithTmux = db
    .prepare("SELECT id, tmux_target, state FROM sessions WHERE tmux_target IS NOT NULL")
    .all() as { id: string; tmux_target: string; state: string }[];

  for (const session of sessionsWithTmux) {
    const content = capturePaneContent(session.tmux_target);
    if (!content) continue;

    const isWorking = isPaneShowingWorking(content);

    if (isWorking && session.state !== "busy") {
      db.prepare("UPDATE sessions SET state = 'busy', current_action = 'Working...', last_update = ? WHERE id = ?")
        .run(Date.now(), session.id);
    } else if (!isWorking && session.state === "busy") {
      db.prepare("UPDATE sessions SET state = 'idle', current_action = NULL, last_update = ? WHERE id = ?")
        .run(Date.now(), session.id);
    }
  }
}

// GET /api/sessions
sessionsRoutes.get("/", (c) => {
  let db: Database.Database | null = null;
  try {
    db = getDb();
    // Sync state with actual pane content before returning
    syncSessionStates(db);
    const sessions = getAllSessions(db);
    // Enrich sessions with pane titles from tmux
    const enrichedSessions = sessions.map(s => ({
      ...s,
      pane_title: s.tmux_target ? getPaneTitle(s.tmux_target) : null,
    }));
    const response: SessionsResponse = {
      sessions: enrichedSessions,
      count: enrichedSessions.length,
      timestamp: Date.now(),
    };
    return c.json(response);
  } catch {
    const error: ErrorResponse = { error: "Database error" };
    return c.json(error, 500);
  } finally {
    db?.close();
  }
});

// GET /api/sessions/:id
sessionsRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  let db: Database.Database | null = null;
  try {
    db = getDb();
    const session = getSession(db, id);
    if (!session) {
      const error: ErrorResponse = { error: "Session not found", id };
      return c.json(error, 404);
    }
    const response: SessionResponse = {
      session,
      timestamp: Date.now(),
    };
    return c.json(response);
  } catch {
    const error: ErrorResponse = { error: "Database error" };
    return c.json(error, 500);
  } finally {
    db?.close();
  }
});
