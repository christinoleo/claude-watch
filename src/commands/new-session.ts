import { Command } from "commander";
import { execFileSync } from "child_process";
import { existsSync, statSync } from "fs";
import { upsertSession } from "../db/sessions-json.js";

export function createNewSessionCommand(): Command {
  return new Command("new-session")
    .description("Spawn a new Claude Code session in a detached tmux session")
    .requiredOption("--cwd <path>", "Working directory for the new session")
    .option("--name <name>", "Custom session name (default: claude-<timestamp>)")
    .option("--no-skip-permissions", "Don't add --dangerously-skip-permissions")
    .action((options: { cwd: string; name?: string; skipPermissions: boolean }) => {
      const cwd = options.cwd;

      if (!existsSync(cwd)) {
        process.stderr.write(
          JSON.stringify({ error: "Directory does not exist", cwd }) + "\n"
        );
        process.exit(2);
      }

      const stat = statSync(cwd);
      if (!stat.isDirectory()) {
        process.stderr.write(
          JSON.stringify({ error: "Path is not a directory", cwd }) + "\n"
        );
        process.exit(2);
      }

      const sessionName = options.name || `claude-${Date.now()}`;
      const claudeArgs = ["claude"];
      if (options.skipPermissions) {
        claudeArgs.push("--dangerously-skip-permissions");
      }

      try {
        const tmuxArgs = ["new-session", "-d", "-s", sessionName, "-c", cwd, "--", ...claudeArgs];
        execFileSync("tmux", tmuxArgs, { stdio: "ignore" });

        // Detect actual base-index from tmux config
        const baseIndex = execFileSync("tmux", ["show-option", "-gv", "base-index"], {
          encoding: "utf-8",
        }).trim() || "0";
        const paneBaseIndex = execFileSync("tmux", ["show-option", "-gv", "pane-base-index"], {
          encoding: "utf-8",
        }).trim() || "0";
        const tmuxTarget = `${sessionName}:${baseIndex}.${paneBaseIndex}`;

        // Pre-register session so it appears in the dashboard
        const id = crypto.randomUUID();
        upsertSession({
          id,
          pid: 0,
          cwd,
          tmux_target: tmuxTarget,
          state: "idle",
        });

        process.stdout.write(
          JSON.stringify({
            ok: true,
            sessionName,
            tmuxTarget,
            id,
          }) + "\n"
        );
      } catch (err) {
        process.stderr.write(
          JSON.stringify({
            error: "Failed to create session",
            detail: err instanceof Error ? err.message : String(err),
          }) + "\n"
        );
        process.exit(2);
      }
    });
}
