import { execSync } from "child_process";
import { isInTmux } from "./detect.js";

/**
 * Get the title of a tmux pane.
 * @param target - The tmux target in format "session:window.pane"
 * @returns The pane title, or null if failed
 */
export function getPaneTitle(target: string): string | null {
  try {
    const result = execSync(`tmux display-message -p -t "${target}" "#{pane_title}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 1000,
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Capture the contents of a tmux pane.
 * @param target - The tmux target in format "session:window.pane"
 * @returns The pane contents as a string, or null if capture failed
 */
export function capturePaneContent(target: string): string | null {
  // Note: tmux capture-pane works even when not running inside tmux,
  // as long as tmux server is running. No need to check isInTmux().
  try {
    const result = execSync(`tmux capture-pane -p -t "${target}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 1000,
    });
    return result;
  } catch (error) {
    console.error(`[pane] Failed to capture pane "${target}":`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Check if the pane content shows Claude is actively working.
 * Looks for "Esc to interrupt" or "ctrl+c to interrupt" in the LAST few lines only,
 * since the status line is at the bottom. Checking the whole pane would give
 * false positives from scrollback history.
 */
export function isPaneShowingWorking(content: string): boolean {
  if (!content) return false;

  // Only check the last 5 lines where the status line would appear
  const lines = content.split('\n');
  const lastLines = lines.slice(-5).join('\n');

  // "Esc to interrupt" or "ctrl+c to interrupt" appears when Claude is actively working
  return lastLines.includes("Esc to interrupt") || lastLines.includes("esc to interrupt") ||
         lastLines.includes("ctrl+c to interrupt") || lastLines.includes("Ctrl+c to interrupt");
}

/**
 * Check if the pane content shows Claude is at the prompt (idle).
 * Claude is idle if the working indicator is NOT present.
 */
export function isPaneShowingPrompt(content: string): boolean {
  if (!content) return false;

  // If working indicator is present, Claude is still working
  if (isPaneShowingWorking(content)) {
    return false;
  }

  return true;
}

