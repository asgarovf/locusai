import { c, HistoryManager } from "@locusai/sdk/node";

/**
 * Format a timestamp as relative time (e.g., "2 hours ago").
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "yesterday" : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  return "just now";
}

/**
 * Session management commands for the Locus CLI.
 * Provides list, show, delete, and clear operations for exec sessions.
 */
export class SessionCommands {
  private historyManager: HistoryManager;

  constructor(projectPath: string) {
    this.historyManager = new HistoryManager(projectPath);
  }

  /**
   * List recent exec sessions with previews and metadata.
   */
  async list(): Promise<void> {
    const sessions = this.historyManager.listSessions();

    if (sessions.length === 0) {
      console.log(`\n  ${c.dim("No exec sessions found.")}\n`);
      return;
    }

    console.log(`\n  ${c.primary("Recent Exec Sessions:")}\n`);

    for (const session of sessions.slice(0, 10)) {
      const shortId = this.getShortId(session.id);
      const age = formatRelativeTime(session.updatedAt);
      const msgCount = session.messages.length;

      // Get preview from first user message
      const firstUserMsg = session.messages.find((m) => m.role === "user");
      const preview = firstUserMsg
        ? firstUserMsg.content.slice(0, 50).replace(/\n/g, " ")
        : "(empty session)";

      console.log(
        `  ${c.cyan(shortId)} ${c.gray("-")} ${preview}${firstUserMsg && firstUserMsg.content.length > 50 ? "..." : ""}`
      );
      console.log(`    ${c.dim(`${msgCount} messages • ${age}`)}`);
      console.log();
    }

    if (sessions.length > 10) {
      console.log(c.dim(`  ... and ${sessions.length - 10} more sessions\n`));
    }
  }

  /**
   * Show the full conversation of a specific session.
   */
  async show(sessionId: string): Promise<void> {
    if (!sessionId) {
      console.error(`\n  ${c.error("Error:")} Session ID is required\n`);
      console.log(
        `  ${c.dim("Usage: locus exec sessions show <session-id>")}\n`
      );
      return;
    }

    const session = this.historyManager.findSessionByPartialId(sessionId);

    if (!session) {
      console.error(
        `\n  ${c.error("Error:")} Session ${c.cyan(sessionId)} not found\n`
      );
      console.log(
        `  ${c.dim("Use 'locus exec sessions list' to see available sessions")}\n`
      );
      return;
    }

    console.log(`\n  ${c.primary("Session:")} ${c.cyan(session.id)}`);
    console.log(
      `  ${c.dim(`Created: ${new Date(session.createdAt).toLocaleString()}`)}`
    );
    console.log(
      `  ${c.dim(`Model: ${session.metadata.model} (${session.metadata.provider})`)}\n`
    );

    if (session.messages.length === 0) {
      console.log(`  ${c.dim("(No messages in this session)")}\n`);
      return;
    }

    console.log(c.dim("  ─".repeat(30)));
    console.log();

    for (const message of session.messages) {
      const role = message.role === "user" ? c.cyan("You") : c.green("AI");
      const content = message.content;

      console.log(`  ${role}:`);
      // Indent message content
      const lines = content.split("\n");
      for (const line of lines) {
        console.log(`    ${line}`);
      }
      console.log();
    }
  }

  /**
   * Delete a specific session by ID.
   */
  async delete(sessionId: string): Promise<void> {
    if (!sessionId) {
      console.error(`\n  ${c.error("Error:")} Session ID is required\n`);
      console.log(
        `  ${c.dim("Usage: locus exec sessions delete <session-id>")}\n`
      );
      return;
    }

    const session = this.historyManager.findSessionByPartialId(sessionId);

    if (!session) {
      console.error(
        `\n  ${c.error("Error:")} Session ${c.cyan(sessionId)} not found\n`
      );
      return;
    }

    const deleted = this.historyManager.deleteSession(session.id);

    if (deleted) {
      console.log(
        `\n  ${c.success("✔")} Deleted session ${c.cyan(this.getShortId(session.id))}\n`
      );
    } else {
      console.error(`\n  ${c.error("Error:")} Failed to delete session\n`);
    }
  }

  /**
   * Clear all exec sessions.
   */
  async clear(): Promise<void> {
    const count = this.historyManager.getSessionCount();

    if (count === 0) {
      console.log(`\n  ${c.dim("No sessions to clear.")}\n`);
      return;
    }

    const deleted = this.historyManager.clearAllSessions();
    console.log(
      `\n  ${c.success("✔")} Cleared ${deleted} exec session${deleted === 1 ? "" : "s"}\n`
    );
  }

  /**
   * Get a short version of the session ID (8 characters from the unique part).
   */
  private getShortId(sessionId: string): string {
    // Session IDs look like: session-{timestamp}-{random}
    // Extract the last part (random) which is unique enough
    const parts = sessionId.split("-");
    if (parts.length >= 3) {
      return parts.slice(-1)[0].slice(0, 8);
    }
    return sessionId.slice(0, 8);
  }
}

/**
 * Show help for session commands.
 */
export function showSessionsHelp(): void {
  console.log(`
  ${c.primary("Session Commands")}

  ${c.success("list")}                 List recent exec sessions
  ${c.success("show")} ${c.dim("<id>")}            Show all messages in a session
  ${c.success("delete")} ${c.dim("<id>")}          Delete a specific session
  ${c.success("clear")}                Clear all exec sessions

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} locus exec sessions list
    ${c.dim("$")} locus exec sessions show e7f3a2b1
    ${c.dim("$")} locus exec sessions delete e7f3a2b1
    ${c.dim("$")} locus exec sessions clear

  ${c.dim("Session IDs can be partial (first 8 characters).")}
`);
}
