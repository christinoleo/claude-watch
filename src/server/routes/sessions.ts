import { Hono } from "hono";
import { getAllSessions, getSession, updateSession } from "../../db/index.js";
import { capturePaneContent, isPaneShowingWorking, getPaneTitle } from "../../tmux/pane.js";
import type { SessionsResponse, SessionResponse, ErrorResponse } from "../types.js";

export const sessionsRoutes = new Hono();

// Sync session state with actual tmux pane content
function syncSessionStates(): void {
  const sessions = getAllSessions().filter((s) => s.tmux_target);

  for (const session of sessions) {
    if (!session.tmux_target) continue;

    const content = capturePaneContent(session.tmux_target);
    if (!content) continue;

    const isWorking = isPaneShowingWorking(content);

    if (isWorking && session.state !== "busy") {
      updateSession(session.id, { state: "busy", current_action: "Working..." });
    } else if (!isWorking && session.state === "busy") {
      updateSession(session.id, { state: "idle", current_action: null });
    }
  }
}

// GET /api/sessions
sessionsRoutes.get("/", (c) => {
  try {
    syncSessionStates();
    const sessions = getAllSessions();
    // Enrich sessions with pane titles from tmux
    const enrichedSessions = sessions.map((s) => ({
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
    const error: ErrorResponse = { error: "Error reading sessions" };
    return c.json(error, 500);
  }
});

// GET /api/sessions/:id
sessionsRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  try {
    const session = getSession(id);
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
    const error: ErrorResponse = { error: "Error reading session" };
    return c.json(error, 500);
  }
});
