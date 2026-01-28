import { Command } from "commander";
import { runUninstall } from "../setup/index.js";

export async function runUninstallCommand(): Promise<void> {
  await runUninstall();
  process.exit(0);
}

export function createUninstallCommand(): Command {
  return new Command("uninstall")
    .description("Remove claude-watch hooks and configuration")
    .action(runUninstallCommand);
}
