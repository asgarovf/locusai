import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SessionStatus, type SessionSummary } from "@locusai/shared";

// ============================================================================
// Disk Session Format (as written by CLI's HistoryManager)
// ============================================================================

interface DiskConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  metadata?: {
    toolsUsed?: string[];
    duration?: number;
  };
}

interface DiskConversationSession {
  id: string;
  projectPath: string;
  messages: DiskConversationMessage[];
  createdAt: number;
  updatedAt: number;
  metadata: {
    model: string;
    provider: string;
  };
}

// ============================================================================
// Reader
// ============================================================================

/**
 * Read session JSON files from `.locus/sessions/` on disk and convert
 * them to `SessionSummary` objects for display in the VSCode UI.
 *
 * These sessions are created by the CLI's `HistoryManager` and are
 * independent of the VSCode extension's `SessionStore` (globalState).
 */
export function readDiskSessions(cwd: string): SessionSummary[] {
  const sessionsDir = join(cwd, ".locus", "sessions");

  if (!existsSync(sessionsDir)) {
    return [];
  }

  const summaries: SessionSummary[] = [];

  let files: string[];
  try {
    files = readdirSync(sessionsDir);
  } catch {
    return [];
  }

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    try {
      const content = readFileSync(join(sessionsDir, file), "utf-8");
      const session = JSON.parse(content) as DiskConversationSession;

      const userMessages = session.messages.filter((m) => m.role === "user");
      const firstUserMessage = userMessages[0]?.content ?? "";
      const title = firstUserMessage.slice(0, 100) || session.id.slice(0, 7);

      summaries.push({
        sessionId: session.id,
        status: SessionStatus.COMPLETED,
        model: session.metadata?.model,
        title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
        toolCount: 0,
      });
    } catch {
      // Skip malformed files silently
    }
  }

  // Sort by updatedAt descending (most recent first)
  summaries.sort((a, b) => b.updatedAt - a.updatedAt);

  return summaries;
}
