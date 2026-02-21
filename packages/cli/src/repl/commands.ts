import { c } from "@locusai/sdk/node";
import { artifactsCommand } from "./commands/artifacts-command";
import { modelCommand, providerCommand } from "./commands/config-commands";
import { discussCommand } from "./commands/discuss-command";
import { planCommand } from "./commands/plan-command";
import { reviewCommand } from "./commands/review-command";
import {
  type REPLSession,
  type SlashCommand,
  SlashCommandRegistry,
} from "./slash-commands";

export type { SlashCommand, REPLSession };
export { SlashCommandRegistry };

/**
 * Legacy interface kept for type compatibility.
 */
export interface ReplCommand {
  name: string;
  aliases: string[];
  description: string;
  execute: (session: REPLSession, args?: string) => Promise<void> | void;
}

/**
 * The global slash command registry.
 * All built-in commands are registered here at module load time.
 */
export const registry = new SlashCommandRegistry();

// ── Session commands ──────────────────────────────────────────

registry.register({
  name: "exit",
  aliases: ["quit", "q"],
  description: "Exit interactive mode",
  usage: "/exit",
  category: "session",
  execute: (session) => session.shutdown(),
});

registry.register({
  name: "clear",
  aliases: ["cls"],
  description: "Clear the screen",
  usage: "/clear",
  category: "session",
  execute: () => console.clear(),
});

registry.register({
  name: "reset",
  aliases: ["r"],
  description: "Reset conversation context",
  usage: "/reset",
  category: "session",
  execute: (session) => session.resetContext(),
});

registry.register({
  name: "session",
  aliases: ["sid"],
  description: "Show current session ID",
  usage: "/session",
  category: "session",
  execute: (session) => {
    console.log(
      `\n  ${c.dim("Session ID:")} ${c.cyan(session.getSessionId())}\n`
    );
  },
});

registry.register({
  name: "status",
  aliases: [],
  description: "Show current session status",
  usage: "/status",
  category: "session",
  execute: (session) => {
    const mode = session.getMode?.() ?? "prompt";
    const discussionState = session.getDiscussionState?.();

    console.log(`\n  ${c.primary("Session Status")}\n`);
    console.log(`  ${c.dim("Provider:")}  ${c.bold(session.getProvider())}`);
    console.log(`  ${c.dim("Model:")}     ${c.bold(session.getModel())}`);
    console.log(`  ${c.dim("Session:")}   ${c.cyan(session.getSessionId())}`);
    console.log(`  ${c.dim("Mode:")}      ${c.bold(mode)}`);
    if (mode === "discussion" && discussionState) {
      console.log(
        `  ${c.dim("Discussion:")} ${c.yellow(discussionState.discussionId)}`
      );
    }
    console.log(`  ${c.dim("Project:")}   ${session.getProjectPath()}`);
    console.log();
  },
});

registry.register({
  name: "history",
  aliases: ["hist"],
  description: "List recent sessions",
  usage: "/history [limit]",
  category: "session",
  execute: (session, args) => showHistory(session, args),
});

registry.register({
  name: "help",
  aliases: ["?", "h"],
  description: "Show this help",
  usage: "/help",
  category: "session",
  execute: () => registry.showHelp(),
});

// ── Config commands ───────────────────────────────────────────

registry.register(providerCommand);
registry.register(modelCommand);

// ── AI commands ──────────────────────────────────────────────

registry.register(discussCommand);
registry.register(planCommand);
registry.register(reviewCommand);
registry.register(artifactsCommand);

/**
 * Parse user input and return matching command if found.
 * Supports both "/command" and bare-word syntax for backward compatibility.
 */
export function parseCommand(
  input: string
): { command: ReplCommand; args: string } | null {
  const result = registry.parse(input);
  if (!result) return null;

  // Map SlashCommand back to ReplCommand shape for callers that expect it
  return {
    command: {
      name: result.command.name,
      aliases: result.command.aliases,
      description: result.command.description,
      execute: result.command.execute,
    },
    args: result.args,
  };
}

/**
 * Legacy export — flat list of all registered commands as ReplCommand[].
 */
export const REPL_COMMANDS: ReplCommand[] = registry.getAll().map((cmd) => ({
  name: cmd.name,
  aliases: cmd.aliases,
  description: cmd.description,
  execute: cmd.execute,
}));

/**
 * Display session history.
 */
function showHistory(session: REPLSession, args?: string): void {
  const historyManager = session.getHistoryManager();
  const limit = args ? Number.parseInt(args, 10) : 10;
  const sessions = historyManager.listSessions({
    limit: Number.isNaN(limit) ? 10 : limit,
  });

  if (sessions.length === 0) {
    console.log(`\n  ${c.dim("No sessions found.")}\n`);
    return;
  }

  console.log(`\n  ${c.primary("Recent Sessions")}\n`);

  for (const sess of sessions) {
    const date = new Date(sess.updatedAt);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();
    const msgCount = sess.messages.length;
    const isCurrent = sess.id === session.getSessionId();
    const marker = isCurrent ? c.success("*") : " ";

    console.log(
      `  ${marker} ${c.cyan(sess.id)} ${c.dim(`- ${dateStr} ${timeStr} (${msgCount} messages)`)}`
    );

    // Show preview of last message if exists
    if (sess.messages.length > 0) {
      const lastMsg = sess.messages[sess.messages.length - 1];
      const preview = lastMsg.content.slice(0, 60).replace(/\n/g, " ");
      console.log(
        `      ${c.dim(preview + (lastMsg.content.length > 60 ? "..." : ""))}`
      );
    }
  }

  console.log(`\n  ${c.dim("Use --session <id> to resume a session")}\n`);
}
