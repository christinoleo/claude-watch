import { Command } from "commander";
import { execFileSync } from "child_process";
import { resolveSessionOrExit } from "./resolve-session.js";

export function createCaptureCommand(): Command {
  return new Command("capture")
    .description("Capture tmux pane content")
    .argument("<target>", "Session ID or tmux target")
    .option("--lines <n>", "Last N lines (default: full pane)")
    .action((target: string, options: { lines?: string }) => {
      const session = resolveSessionOrExit(target);
      const tmuxTarget = session.tmux_target;

      if (!tmuxTarget) {
        process.stderr.write(
          JSON.stringify({ error: "Session has no tmux target", id: session.id }) + "\n"
        );
        process.exit(2);
      }

      try {
        const args = ["capture-pane", "-t", tmuxTarget, "-p", "-e"];
        if (options.lines) {
          args.push("-S", `-${options.lines}`);
        }
        const output = execFileSync("tmux", args, { encoding: "utf-8" });
        process.stdout.write(output);
      } catch (err) {
        process.stderr.write(
          JSON.stringify({
            error: "Failed to capture pane",
            detail: err instanceof Error ? err.message : String(err),
          }) + "\n"
        );
        process.exit(2);
      }
    });
}
