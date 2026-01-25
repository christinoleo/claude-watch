#!/usr/bin/env node

import { copyFileSync, existsSync, unlinkSync } from "fs";
import Database from "better-sqlite3";
import { join } from "path";
import { homedir } from "os";

const DB_PATH = join(homedir(), ".claude-watch", "state.db");
const BACKUP_PATH = join(homedir(), ".claude-watch", "state.db.backup");

const DEMO_SESSIONS = [
  // Busy sessions (green)
  {
    id: "demo-1",
    pid: 10001,
    cwd: join(homedir(), "projects/api-server"),
    tmux_target: "dev:0.0",
    state: "busy",
    current_action: "Running: Bash",
    prompt_text: null,
  },
  {
    id: "demo-2",
    pid: 10002,
    cwd: join(homedir(), "projects/webapp"),
    tmux_target: "dev:0.1",
    state: "busy",
    current_action: "Running: Edit",
    prompt_text: null,
  },
  {
    id: "demo-3",
    pid: 10003,
    cwd: join(homedir(), "projects/cli-tool"),
    tmux_target: "dev:1.0",
    state: "busy",
    current_action: "Working...",
    prompt_text: null,
  },
  // Idle sessions (yellow)
  {
    id: "demo-4",
    pid: 10004,
    cwd: join(homedir(), "projects/docs"),
    tmux_target: "dev:1.1",
    state: "idle",
    current_action: null,
    prompt_text: null,
  },
  {
    id: "demo-5",
    pid: 10005,
    cwd: join(homedir(), "projects/tests"),
    tmux_target: "dev:2.0",
    state: "idle",
    current_action: null,
    prompt_text: null,
  },
  // Permission/Waiting sessions (red)
  {
    id: "demo-6",
    pid: 10006,
    cwd: join(homedir(), "projects/deploy"),
    tmux_target: "main:0.0",
    state: "permission",
    current_action: null,
    prompt_text: null,
  },
  {
    id: "demo-7",
    pid: 10007,
    cwd: join(homedir(), "projects/config"),
    tmux_target: "main:0.1",
    state: "waiting",
    current_action: null,
    prompt_text: "Which database should I use?",
  },
];

function seed() {
  if (!existsSync(DB_PATH)) {
    console.error("Database not found at", DB_PATH);
    console.error("Run 'claude-watch --setup' first.");
    process.exit(1);
  }

  // Backup current state
  console.log("Backing up current database...");
  copyFileSync(DB_PATH, BACKUP_PATH);
  console.log("  Saved to:", BACKUP_PATH);

  // Insert demo data
  console.log("Inserting demo sessions...");
  const db = new Database(DB_PATH);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO sessions (id, pid, cwd, tmux_target, state, current_action, prompt_text, last_update, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `);

  const now = Date.now();
  for (const session of DEMO_SESSIONS) {
    insert.run(
      session.id,
      session.pid,
      session.cwd,
      session.tmux_target,
      session.state,
      session.current_action,
      session.prompt_text,
      now
    );
    console.log(`  + ${session.id}: ${session.state} - ${session.cwd}`);
  }

  db.close();
  console.log("\nDone! Run 'claude-watch' to see the demo data.");
  console.log("Run 'node scripts/demo-data.js restore' to restore original state.");
}

function restore() {
  if (!existsSync(BACKUP_PATH)) {
    console.error("No backup found at", BACKUP_PATH);
    console.error("Nothing to restore.");
    process.exit(1);
  }

  console.log("Restoring database from backup...");
  copyFileSync(BACKUP_PATH, DB_PATH);
  unlinkSync(BACKUP_PATH);
  console.log("Done! Original state restored.");
}

function clearDemo() {
  if (!existsSync(DB_PATH)) {
    console.error("Database not found at", DB_PATH);
    process.exit(1);
  }

  console.log("Removing demo sessions...");
  const db = new Database(DB_PATH);

  const deleteStmt = db.prepare("DELETE FROM sessions WHERE id LIKE 'demo-%'");
  const result = deleteStmt.run();
  console.log(`  Removed ${result.changes} demo sessions.`);

  db.close();
  console.log("Done!");
}

// CLI
const command = process.argv[2];

switch (command) {
  case "seed":
    seed();
    break;
  case "restore":
    restore();
    break;
  case "clear":
    clearDemo();
    break;
  default:
    console.log("Usage: node scripts/demo-data.js <command>");
    console.log("");
    console.log("Commands:");
    console.log("  seed     Back up current DB and insert demo sessions");
    console.log("  restore  Restore DB from backup");
    console.log("  clear    Remove demo sessions without restoring backup");
    process.exit(1);
}
