import { Command } from "commander";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { CLAUDE_WATCH_DIR, SESSIONS_DIR, DEFAULT_SERVER_PORT } from "../utils/paths.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServeOptions {
  port: string;
  host: string;
}

export async function runServe(options: ServeOptions): Promise<void> {
  // Auto-create data directories if needed
  if (!existsSync(CLAUDE_WATCH_DIR)) {
    mkdirSync(CLAUDE_WATCH_DIR, { recursive: true });
  }
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  // Path to built SvelteKit server
  const serverPath = join(__dirname, "..", "web", "index.js");

  if (!existsSync(serverPath)) {
    console.error(`SvelteKit server not found at: ${serverPath}`);
    console.error("Run 'bun run build' first.");
    process.exit(1);
  }

  // Set environment variables for SvelteKit server
  process.env.PORT = options.port;
  process.env.HOST = options.host;

  // Import and run the SvelteKit server (it auto-starts on import)
  await import(serverPath);
}

export function createServeCommand(): Command {
  return new Command("serve")
    .description("Start HTTP server only (no TUI, no tmux required)")
    .option("--port <number>", "Server port", String(DEFAULT_SERVER_PORT))
    .option("--host <address>", "Server host (use 0.0.0.0 for LAN)", "127.0.0.1")
    .action(runServe);
}
