import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getLocusPath } from "../core/config.js";
import type { Discussion, DiscussionInsight } from "./discussion-types.js";

/**
 * Manages the lifecycle of discussions:
 * create, save, load, list, complete, archive, delete.
 */
export class DiscussionManager {
  private discussionsDir: string;

  constructor(projectPath: string) {
    this.discussionsDir = getLocusPath(projectPath, "discussionsDir");
  }

  /**
   * Create a new discussion for a given topic.
   */
  create(topic: string, model: string, provider: string): Discussion {
    this.ensureDir();

    const now = new Date().toISOString();
    const id = `disc-${Date.now()}`;

    const discussion: Discussion = {
      id,
      title: topic,
      topic,
      status: "active",
      messages: [],
      insights: [],
      createdAt: now,
      updatedAt: now,
      metadata: { model, provider },
    };

    this.save(discussion);
    return discussion;
  }

  /**
   * Save a discussion to disk as JSON and summary markdown.
   */
  save(discussion: Discussion): void {
    this.ensureDir();

    const jsonPath = join(this.discussionsDir, `${discussion.id}.json`);
    const mdPath = join(
      this.discussionsDir,
      `summary-${discussion.id}.md`,
    );

    writeFileSync(jsonPath, JSON.stringify(discussion, null, 2), "utf-8");
    writeFileSync(mdPath, this.toMarkdown(discussion), "utf-8");
  }

  /**
   * Load a discussion by ID.
   */
  load(id: string): Discussion | null {
    this.ensureDir();

    const filePath = join(this.discussionsDir, `${id}.json`);
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(filePath, "utf-8")) as Discussion;
    } catch {
      return null;
    }
  }

  /**
   * List all discussions, optionally filtered by status. Sorted newest first.
   */
  list(status?: Discussion["status"]): Discussion[] {
    this.ensureDir();

    const files = readdirSync(this.discussionsDir).filter((f) =>
      f.endsWith(".json"),
    );
    const discussions: Discussion[] = [];

    for (const file of files) {
      try {
        const discussion = JSON.parse(
          readFileSync(join(this.discussionsDir, file), "utf-8"),
        ) as Discussion;
        if (!status || discussion.status === status) {
          discussions.push(discussion);
        }
      } catch {
        // skip unparseable files
      }
    }

    discussions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return discussions;
  }

  /**
   * Mark a discussion as completed.
   */
  complete(id: string): Discussion {
    const discussion = this.load(id);
    if (!discussion) {
      throw new Error(`Discussion not found: ${id}`);
    }

    discussion.status = "completed";
    discussion.updatedAt = new Date().toISOString();
    this.save(discussion);

    return discussion;
  }

  /**
   * Mark a discussion as archived.
   */
  archive(id: string): void {
    const discussion = this.load(id);
    if (!discussion) {
      throw new Error(`Discussion not found: ${id}`);
    }

    discussion.status = "archived";
    discussion.updatedAt = new Date().toISOString();
    this.save(discussion);
  }

  /**
   * Delete a discussion's files entirely.
   */
  delete(id: string): void {
    this.ensureDir();

    const jsonPath = join(this.discussionsDir, `${id}.json`);
    const mdPath = join(this.discussionsDir, `summary-${id}.md`);

    if (existsSync(jsonPath)) {
      unlinkSync(jsonPath);
    }
    if (existsSync(mdPath)) {
      unlinkSync(mdPath);
    }
  }

  /**
   * Append a message to a discussion and save.
   */
  addMessage(
    id: string,
    role: "user" | "assistant",
    content: string,
  ): Discussion {
    const discussion = this.load(id);
    if (!discussion) {
      throw new Error(`Discussion not found: ${id}`);
    }

    discussion.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
    discussion.updatedAt = new Date().toISOString();
    this.save(discussion);

    return discussion;
  }

  /**
   * Append an insight to a discussion and save.
   */
  addInsight(id: string, insight: DiscussionInsight): Discussion {
    const discussion = this.load(id);
    if (!discussion) {
      throw new Error(`Discussion not found: ${id}`);
    }

    discussion.insights.push(insight);
    discussion.updatedAt = new Date().toISOString();
    this.save(discussion);

    return discussion;
  }

  /**
   * Aggregate insights across all completed discussions.
   */
  getAllInsights(): DiscussionInsight[] {
    const discussions = this.list("completed");
    const insights: DiscussionInsight[] = [];

    for (const discussion of discussions) {
      insights.push(...discussion.insights);
    }

    // Sort by creation date, newest first
    insights.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return insights;
  }

  /**
   * Get the markdown content of a discussion for display.
   */
  getMarkdown(id: string): string | null {
    const discussion = this.load(id);
    if (!discussion) return null;
    return this.toMarkdown(discussion);
  }

  /**
   * Render a discussion as readable markdown.
   */
  toMarkdown(discussion: Discussion): string {
    const lines: string[] = [];

    lines.push(`# Discussion: ${discussion.title}`);
    lines.push("");
    lines.push(`**Status:** ${discussion.status.toUpperCase()}`);
    lines.push(`**Topic:** ${discussion.topic}`);
    lines.push(`**Created:** ${discussion.createdAt}`);
    lines.push(`**Updated:** ${discussion.updatedAt}`);
    lines.push(
      `**Model:** ${discussion.metadata.model} (${discussion.metadata.provider})`,
    );
    lines.push("");

    if (discussion.messages.length > 0) {
      lines.push(`## Messages (${discussion.messages.length})`);
      lines.push("");

      for (const msg of discussion.messages) {
        const time = new Date(msg.timestamp).toISOString();
        const roleLabel = msg.role === "user" ? "User" : "Assistant";
        lines.push(`### ${roleLabel} — ${time}`);
        lines.push("");
        lines.push(msg.content);
        lines.push("");
      }
    }

    if (discussion.insights.length > 0) {
      lines.push(`## Insights (${discussion.insights.length})`);
      lines.push("");

      for (const insight of discussion.insights) {
        lines.push(
          `### [${insight.type.toUpperCase()}] ${insight.title}`,
        );
        lines.push("");
        lines.push(insight.content);
        if (insight.tags.length > 0) {
          lines.push("");
          lines.push(`**Tags:** ${insight.tags.join(", ")}`);
        }
        lines.push("");
      }
    }

    lines.push("---");
    lines.push(`*Discussion ID: ${discussion.id}*`);

    return lines.join("\n");
  }

  private ensureDir(): void {
    if (!existsSync(this.discussionsDir)) {
      mkdirSync(this.discussionsDir, { recursive: true });
    }
  }
}
