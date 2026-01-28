import { Command } from "commander";
import { render } from "ink";
import React from "react";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { App } from "../app.js";
import { closeDatabase } from "../db/index.js";
import { isInTmux, getTmuxSessionName } from "../tmux/detect.js";
import { DATABASE_PATH, DEFAULT_SERVER_PORT } from "../utils/paths.js";

const WATCH_SESSION = "watch";

export interface TuiOptions {
  serve?: boolean;
  port: string;
  host: string;
}

export async function runTui(options: TuiOptions): Promise<void> {
  // Check if running in tmux
  if (!isInTmux()) {
    console.error("claude-watch requires tmux to run.");
    console.error("");
    console.error("Start tmux first, then run claude-watch:");
    console.error("  tmux new-session -s watch");
    console.error("  claude-watch");
    process.exit(1);
  }

  // Check if we're in the correct session
  const currentSession = getTmuxSessionName();
  if (currentSession !== WATCH_SESSION) {
    console.log(`Switching to '${WATCH_SESSION}' session...`);

    // Build command to re-invoke claude-watch the same way it was originally called
    const cwd = process.cwd();
    // Escape single quotes in args for shell safety
    const escapeArg = (arg: string) => `'${arg.replace(/'/g, "'\\''")}'`;
    const originalCmd = process.argv.map(escapeArg).join(" ");
    const fullCmd = `cd ${escapeArg(cwd)} && ${originalCmd}`;

    try {
      // Check if watch session exists
      let sessionExists = false;
      try {
        execSync(`tmux has-session -t ${WATCH_SESSION} 2>/dev/null`, { stdio: "ignore" });
        sessionExists = true;
      } catch {
        sessionExists = false;
      }

      if (sessionExists) {
        // Check if claude-watch is running in the session
        let claudeWatchRunning = false;
        try {
          const paneCmd = execSync(
            `tmux list-panes -t ${WATCH_SESSION} -F "#{pane_current_command}"`,
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
          ).trim();
          // Check if node or claude-watch is running (our process)
          claudeWatchRunning = paneCmd.includes("node") || paneCmd.includes("claude-watch");
        } catch {
          claudeWatchRunning = false;
        }

        if (!claudeWatchRunning) {
          // claude-watch not running, start it in the existing session
          execSync(`tmux send-keys -t ${WATCH_SESSION} ${escapeArg(fullCmd)} Enter`, { stdio: "inherit" });
        }

        // Switch to the session
        execSync(`tmux switch-client -t ${WATCH_SESSION}`, { stdio: "inherit" });
      } else {
        // Session doesn't exist, create it with claude-watch running
        execSync(`tmux new-session -d -s ${WATCH_SESSION} ${escapeArg(fullCmd)}`, { stdio: "inherit" });
        execSync(`tmux switch-client -t ${WATCH_SESSION}`, { stdio: "inherit" });
      }
    } catch (error) {
      console.error("Failed to switch to watch session:", error);
      process.exit(1);
    }

    process.exit(0);
  }

  // We're in the watch session, run the TUI

  // Check if setup has been run
  if (!existsSync(DATABASE_PATH)) {
    console.error("claude-watch has not been set up yet.");
    console.error("");
    console.error("Run the setup wizard first:");
    console.error("  claude-watch setup");
    process.exit(1);
  }

  // Add tmux keybinding dynamically (prefix + W to switch to watch session pane 0.0)
  try {
    execSync(`tmux bind-key W run-shell 'tmux switch-client -t ${WATCH_SESSION} && tmux select-window -t ${WATCH_SESSION}:0 && tmux select-pane -t ${WATCH_SESSION}:0.0'`, { stdio: "ignore" });
  } catch {
    // Ignore errors - binding might already exist
  }

  // Start HTTP server if --serve flag is provided
  if (options.serve) {
    const { startServer } = await import("../server/index.js");
    await startServer({ port: parseInt(options.port), host: options.host });
  }

  // Enter alternate screen buffer (like vim, htop)
  process.stdout.write("\x1b[?1049h");
  process.stdout.write("\x1b[H"); // Move cursor to top-left

  const { waitUntilExit } = render(React.createElement(App));

  try {
    await waitUntilExit();
  } finally {
    // Exit alternate screen buffer, restore previous content
    process.stdout.write("\x1b[?1049l");
    closeDatabase();
  }
}

export function createTuiCommand(): Command {
  return new Command("tui")
    .description("Run the TUI dashboard (requires tmux)")
    .option("--serve", "Start HTTP server alongside TUI")
    .option("--port <number>", "Server port", String(DEFAULT_SERVER_PORT))
    .option("--host <address>", "Server host (use 0.0.0.0 for LAN)", "127.0.0.1")
    .action(runTui);
}
