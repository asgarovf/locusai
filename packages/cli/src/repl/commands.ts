/**
 * Slash commands for the REPL.
 * Handles /help, /clear, /reset, /history, /session, etc.
 */

import { execSync } from "node:child_process";
import { inferProviderFromModel } from "../core/ai-models.js";
import { countDiffChanges, renderDiff } from "../display/diff-renderer.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type { Session } from "../types.js";

export interface SlashCommandContext {
  projectRoot: string;
  session: Session;
  /** Callback to reset conversation context. */
  onReset: () => void;
  /** Callback to switch model. */
  onModelChange: (model: string) => void;
  /** Callback to force-save session. */
  onSave: () => void;
  /** Callback to exit the REPL. */
  onExit: () => void;
}

export interface SlashCommandDef {
  name: string;
  aliases: string[];
  description: string;
  handler: (args: string, ctx: SlashCommandContext) => void;
}

/** All available slash commands. */
export function getSlashCommands(): SlashCommandDef[] {
  return [
    {
      name: "/help",
      aliases: ["/h", "/?"],
      description: "Show available commands",
      handler: cmdHelp,
    },
    {
      name: "/clear",
      aliases: ["/cls"],
      description: "Clear screen",
      handler: cmdClear,
    },
    {
      name: "/reset",
      aliases: ["/r"],
      description: "Reset conversation context",
      handler: cmdReset,
    },
    {
      name: "/history",
      aliases: ["/hist"],
      description: "Show input history",
      handler: cmdHistory,
    },
    {
      name: "/session",
      aliases: ["/sid"],
      description: "Show current session info",
      handler: cmdSession,
    },
    {
      name: "/model",
      aliases: ["/m"],
      description: "Switch AI model (provider inferred)",
      handler: cmdModel,
    },
    {
      name: "/diff",
      aliases: ["/d"],
      description: "Show cumulative diff of all changes",
      handler: cmdDiff,
    },
    {
      name: "/undo",
      aliases: ["/u"],
      description: "Undo last AI change",
      handler: cmdUndo,
    },
    {
      name: "/save",
      aliases: [],
      description: "Force-save current session",
      handler: cmdSave,
    },
    {
      name: "/exit",
      aliases: ["/quit", "/q"],
      description: "Exit REPL",
      handler: cmdExit,
    },
  ];
}

/** Get all command names including aliases (for tab completion). */
export function getAllCommandNames(): string[] {
  const commands = getSlashCommands();
  const names: string[] = [];
  for (const cmd of commands) {
    names.push(cmd.name);
    names.push(...cmd.aliases);
  }
  return names;
}

/** Try to handle input as a slash command. Returns true if handled. */
export function handleSlashCommand(
  input: string,
  ctx: SlashCommandContext
): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return false;

  const [cmdName, ...argParts] = trimmed.split(/\s+/);
  const args = argParts.join(" ");
  const commands = getSlashCommands();

  for (const cmd of commands) {
    if (cmd.name === cmdName || cmd.aliases.includes(cmdName)) {
      cmd.handler(args, ctx);
      return true;
    }
  }

  process.stderr.write(`${red("✗")} Unknown command: ${bold(cmdName)}\n`);
  process.stderr.write(`  Type ${cyan("/help")} for available commands.\n`);
  return true;
}

// ─── Command Handlers ───────────────────────────────────────────────────────

function cmdHelp(_args: string, _ctx: SlashCommandContext): void {
  const commands = getSlashCommands();
  process.stderr.write(`\n${bold("Available Commands:")}\n\n`);

  for (const cmd of commands) {
    const aliases =
      cmd.aliases.length > 0 ? dim(` (${cmd.aliases.join(", ")})`) : "";
    process.stderr.write(`  ${cyan(cmd.name.padEnd(12))}${aliases}\n`);
    process.stderr.write(`  ${"".padEnd(12)}${dim(cmd.description)}\n`);
  }
  process.stderr.write("\n");
}

function cmdClear(_args: string, _ctx: SlashCommandContext): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

function cmdReset(_args: string, ctx: SlashCommandContext): void {
  ctx.onReset();
  process.stderr.write(`${green("✓")} Conversation context reset.\n`);
}

function cmdHistory(_args: string, _ctx: SlashCommandContext): void {
  // History is displayed by the REPL orchestrator
  process.stderr.write(
    `${dim("Recent input history is shown above the prompt.")}\n`
  );
}

function cmdSession(_args: string, ctx: SlashCommandContext): void {
  const s = ctx.session;
  process.stderr.write(`\n${bold("Session Info:")}\n`);
  process.stderr.write(`  ${dim("ID:")}       ${s.id}\n`);
  process.stderr.write(
    `  ${dim("Created:")}  ${new Date(s.created).toLocaleString()}\n`
  );
  process.stderr.write(
    `  ${dim("Updated:")}  ${new Date(s.updated).toLocaleString()}\n`
  );
  process.stderr.write(
    `  ${dim("Provider:")} ${s.metadata.provider} / ${s.metadata.model}\n`
  );
  process.stderr.write(`  ${dim("Messages:")} ${s.messages.length}\n`);
  process.stderr.write(
    `  ${dim("Tokens:")}   ${s.metadata.totalTokens.toLocaleString()}\n`
  );
  process.stderr.write(`  ${dim("Tools:")}    ${s.metadata.totalTools}\n`);
  process.stderr.write("\n");
}

function cmdModel(args: string, ctx: SlashCommandContext): void {
  if (!args.trim()) {
    process.stderr.write(
      `${dim("Current model:")} ${bold(ctx.session.metadata.model)} ${dim(`(${ctx.session.metadata.provider})`)}\n`
    );
    process.stderr.write(`${dim("Usage:")} ${cyan("/model <model-name>")}\n`);
    return;
  }

  const model = args.trim();
  const inferredProvider = inferProviderFromModel(model);
  if (!inferredProvider) {
    process.stderr.write(
      `${red("✗")} Unknown model: ${bold(model)}. Use a Claude or Codex model name.\n`
    );
    return;
  }

  ctx.onModelChange(model);
  process.stderr.write(
    `${green("✓")} Model switched to: ${bold(model)} ${dim(`(${inferredProvider})`)}\n`
  );
}

function cmdDiff(_args: string, ctx: SlashCommandContext): void {
  try {
    const diff = execSync("git diff", {
      cwd: ctx.projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!diff.trim()) {
      process.stderr.write(`${dim("No changes.")}\n`);
      return;
    }

    const { additions, deletions, files } = countDiffChanges(diff);
    const filesLabel = files === 1 ? "file" : "files";

    // Summary header
    process.stderr.write("\n");
    process.stderr.write(
      `${bold("Changes:")}  ${cyan(`${files} ${filesLabel}`)}  ${green(`+${additions}`)}  ${red(`-${deletions}`)}\n`
    );
    process.stderr.write(`${dim("─".repeat(60))}\n`);

    // Rendered diff
    const lines = renderDiff(diff);
    for (const line of lines) {
      process.stderr.write(`${line}\n`);
    }

    // Footer
    process.stderr.write(`${dim("─".repeat(60))}\n`);
    process.stderr.write(
      dim(
        `${yellow("tip:")} use ${cyan("/undo")} to revert all unstaged changes\n`
      )
    );
    process.stderr.write("\n");
  } catch {
    process.stderr.write(`${red("✗")} Could not get diff.\n`);
  }
}

function cmdUndo(_args: string, ctx: SlashCommandContext): void {
  try {
    // Check if there are unstaged changes
    const status = execSync("git status --porcelain", {
      cwd: ctx.projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!status) {
      process.stderr.write(`${dim("No changes to undo.")}\n`);
      return;
    }

    // Undo last change
    execSync("git checkout .", {
      cwd: ctx.projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    process.stderr.write(`${green("✓")} Reverted all unstaged changes.\n`);
  } catch {
    process.stderr.write(`${red("✗")} Could not undo changes.\n`);
  }
}

function cmdSave(_args: string, ctx: SlashCommandContext): void {
  ctx.onSave();
  process.stderr.write(`${green("✓")} Session saved.\n`);
}

function cmdExit(_args: string, ctx: SlashCommandContext): void {
  ctx.onExit();
}
