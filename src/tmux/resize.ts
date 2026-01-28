import { execFileSync } from "child_process";

/**
 * Resize a tmux window to the specified dimensions.
 * Uses resize-window instead of resize-pane for detached sessions.
 *
 * @param target - The tmux target in format "session:window.pane"
 * @param cols - Number of columns (clamped to 20-500)
 * @param rows - Number of rows (clamped to 5-200)
 */
export function resizeTmuxWindow(target: string, cols: number, rows: number): void {
  try {
    const safeCols = Math.max(20, Math.min(500, Math.floor(cols)));
    const safeRows = Math.max(5, Math.min(200, Math.floor(rows)));
    // Extract window target (session:window) from full target (session:window.pane)
    const windowTarget = target.replace(/\.\d+$/, "");
    execFileSync(
      "tmux",
      ["resize-window", "-t", windowTarget, "-x", String(safeCols), "-y", String(safeRows)],
      {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 2000,
      }
    );
  } catch {
    // Pane may not exist or tmux error - ignore
  }
}
