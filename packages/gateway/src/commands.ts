/**
 * Command registry — defines all available commands and their properties.
 *
 * This is the single source of truth for command→CLI argument mapping,
 * streaming behavior, and argument requirements.
 */

import type { CommandDefinition } from "./types.js";

/** All known Locus CLI commands. */
export const COMMAND_REGISTRY: Record<string, CommandDefinition> = {
  run: { cliArgs: ["run"], streaming: true },
  status: { cliArgs: ["status"], streaming: false },
  issues: { cliArgs: ["issue", "list"], streaming: false },
  issue: { cliArgs: ["issue", "show"], streaming: false },
  sprint: { cliArgs: ["sprint"], streaming: false },
  plan: { cliArgs: ["plan"], streaming: true },
  review: { cliArgs: ["review"], streaming: true },
  iterate: { cliArgs: ["iterate"], streaming: true },
  discuss: {
    cliArgs: ["discuss"],
    streaming: true,
    requiresArgs:
      "Please provide a discussion topic.\n\nExample: /discuss Should we use Redis or in-memory caching?",
  },
  exec: {
    cliArgs: ["exec"],
    streaming: true,
    requiresArgs:
      "Please provide a prompt.\n\nExample: /exec Add error handling to the API",
  },
  logs: { cliArgs: ["logs"], streaming: false },
  config: { cliArgs: ["config"], streaming: false },
  artifacts: { cliArgs: ["artifacts"], streaming: false },
};

/** Commands that produce streaming (long-running) output. */
export const STREAMING_COMMANDS = new Set(
  Object.entries(COMMAND_REGISTRY)
    .filter(([, def]) => def.streaming)
    .map(([name]) => name)
);

/** Get the command definition for a command name, or null if not found. */
export function getCommandDefinition(
  command: string
): CommandDefinition | null {
  return COMMAND_REGISTRY[command] ?? null;
}
