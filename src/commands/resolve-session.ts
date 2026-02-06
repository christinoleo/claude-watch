import { getSession, getAllSessions, type Session } from "../db/sessions-json.js";

/**
 * Resolve a target string to a Session object.
 *
 * Lookup order:
 * 1. Exact session ID via getSession(id)
 * 2. Exact tmux_target match via getAllSessions()
 * 3. Prefix match on tmux_target (e.g., "claude-123" matches "claude-123:1.1")
 */
export function resolveSession(target: string): Session | null {
  // 1. Exact session ID
  const byId = getSession(target);
  if (byId) return byId;

  // 2. Exact tmux_target match
  const all = getAllSessions();
  const exactTmux = all.find((s) => s.tmux_target === target);
  if (exactTmux) return exactTmux;

  // 3. Prefix match on tmux_target
  const prefixMatch = all.find(
    (s) => s.tmux_target != null && s.tmux_target.startsWith(target)
  );
  if (prefixMatch) return prefixMatch;

  return null;
}

/**
 * Resolve a target to a Session, or print JSON error to stderr and exit with code 2.
 */
export function resolveSessionOrExit(target: string): Session {
  const session = resolveSession(target);
  if (!session) {
    process.stderr.write(
      JSON.stringify({ error: "Session not found", target }) + "\n"
    );
    process.exit(2);
  }
  return session;
}
