import { Command } from "commander";
import { existsSync } from "fs";
import { DATABASE_PATH, DEFAULT_SERVER_PORT } from "../utils/paths.js";

export interface ServeOptions {
  port: string;
  host: string;
}

export async function runServe(options: ServeOptions): Promise<void> {
  if (!existsSync(DATABASE_PATH)) {
    console.error("claude-watch has not been set up yet.");
    console.error("");
    console.error("Run the setup wizard first:");
    console.error("  claude-watch setup");
    process.exit(1);
  }

  const { startServer } = await import("../server/index.js");
  await startServer({
    port: parseInt(options.port),
    host: options.host,
  });
  // Keep process running (server is running)
}

export function createServeCommand(): Command {
  return new Command("serve")
    .description("Start HTTP server only (no TUI, no tmux required)")
    .option("--port <number>", "Server port", String(DEFAULT_SERVER_PORT))
    .option("--host <address>", "Server host (use 0.0.0.0 for LAN)", "127.0.0.1")
    .action(runServe);
}
