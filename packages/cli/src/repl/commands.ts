import { c } from "@locusai/sdk/node";
import type { InteractiveSession } from "./interactive-session";

export interface ReplCommand {
  name: string;
  aliases: string[];
  description: string;
  execute: (session: InteractiveSession, args?: string) => Promise<void> | void;
}

/**
 * Built-in REPL commands for the interactive session.
 */
export const REPL_COMMANDS: ReplCommand[] = [
  {
    name: "exit",
    aliases: ["quit", "q"],
    description: "Exit interactive mode",
    execute: (session) => session.shutdown(),
  },
  {
    name: "clear",
    aliases: ["cls"],
    description: "Clear the screen",
    execute: () => console.clear(),
  },
  {
    name: "help",
    aliases: ["?", "h"],
    description: "Show available commands",
    execute: () => showHelp(),
  },
  {
    name: "reset",
    aliases: ["r"],
    description: "Reset conversation context",
    execute: (session) => session.resetContext(),
  },
  {
    name: "history",
    aliases: ["hist"],
    description: "List recent sessions",
    execute: (session, args) => showHistory(session, args),
  },
  {
    name: "session",
    aliases: ["sid"],
    description: "Show current session ID",
    execute: (session) => {
      console.log(
        `\n  ${c.dim("Session ID:")} ${c.cyan(session.getSessionId())}\n`
      );
    },
  },
];

/**
 * Parse user input and return matching command if found.
 */
export function parseCommand(input: string): ReplCommand | null {
  const lowerInput = input.toLowerCase();

  for (const cmd of REPL_COMMANDS) {
    if (lowerInput === cmd.name || cmd.aliases.includes(lowerInput)) {
      return cmd;
    }
  }

  return null;
}

/**
 * Display help for all available REPL commands.
 */
function showHelp(): void {
  console.log(`
  ${c.primary("Available Commands")}

  ${c.success("exit")} / ${c.dim("quit, q")}       Exit interactive mode
  ${c.success("clear")} / ${c.dim("cls")}          Clear the screen
  ${c.success("help")} / ${c.dim("?, h")}          Show this help message
  ${c.success("reset")} / ${c.dim("r")}            Reset conversation context
  ${c.success("history")} / ${c.dim("hist")}       List recent sessions
  ${c.success("session")} / ${c.dim("sid")}        Show current session ID

  ${c.primary("Key Bindings")}

  ${c.success("Enter")}              Send message
  ${c.success("Shift+Enter")}        Insert newline (also: Alt+Enter, Ctrl+J)
  ${c.success("Ctrl+C")}             Interrupt running agent / clear input / exit
  ${c.success("Ctrl+D")}             Exit (on empty input)
  ${c.success("Ctrl+U")}             Clear current input
  ${c.success("Ctrl+W")}             Delete last word

  ${c.dim("Any other input will be sent as a prompt to the AI.")}
`);
}

/**
 * Display session history.
 */
function showHistory(session: InteractiveSession, args?: string): void {
  const historyManager = session.getHistoryManager();
  const limit = args ? parseInt(args, 10) : 10;
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
