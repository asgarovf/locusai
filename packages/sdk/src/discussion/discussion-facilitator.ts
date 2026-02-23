import { existsSync, readFileSync } from "node:fs";
import type { LogFn } from "../ai/factory.js";
import { noopLogger } from "../ai/factory.js";
import type { AiRunner } from "../ai/runner.js";
import { getLocusPath, Provider } from "../core/config.js";
import type { StreamChunk } from "../exec/types.js";
import {
  buildFacilitatorPrompt,
  buildSummaryPrompt,
} from "./agents/facilitator-prompt.js";
import type { DiscussionManager } from "./discussion-manager.js";
import type { Discussion, DiscussionInsight } from "./discussion-types.js";

export interface DiscussionFacilitatorConfig {
  projectPath: string;
  aiRunner: AiRunner;
  discussionManager: DiscussionManager;
  log?: LogFn;
  provider: Provider;
  model: string;
}

export interface StartDiscussionResult {
  discussion: Discussion;
  message: string;
}

export interface ContinueDiscussionResult {
  response: string;
  insights: DiscussionInsight[];
}

export class DiscussionFacilitator {
  private projectPath: string;
  private aiRunner: AiRunner;
  private discussionManager: DiscussionManager;
  private log: LogFn;
  private provider: string;
  private model: string;

  constructor(config: DiscussionFacilitatorConfig) {
    this.projectPath = config.projectPath;
    this.aiRunner = config.aiRunner;
    this.discussionManager = config.discussionManager;
    this.log = config.log ?? noopLogger;
    this.provider = config.provider;
    this.model = config.model;
  }

  /**
   * Start a new discussion on a topic. Creates the discussion,
   * generates the AI's opening question, and saves it.
   */
  async startDiscussion(topic: string): Promise<StartDiscussionResult> {
    this.log("Starting new discussion...", "info");

    const discussion = this.discussionManager.create(
      topic,
      this.model,
      this.provider
    );

    const { projectContext, learnings, knowledgeBase } = this.buildContext();

    const prompt = buildFacilitatorPrompt({
      topic,
      projectContext,
      learnings,
      knowledgeBase,
      previousMessages: [],
      insights: [],
      isFirstMessage: true,
    });

    const response = await this.aiRunner.run(prompt);
    const { cleanResponse } = this.parseInsights(response);

    this.discussionManager.addMessage(
      discussion.id,
      "assistant",
      cleanResponse
    );

    this.log("Discussion started", "success");

    const saved = this.discussionManager.load(discussion.id);
    if (!saved) {
      throw new Error(
        `Failed to load discussion after creation: ${discussion.id}`
      );
    }

    return {
      discussion: saved,
      message: cleanResponse,
    };
  }

  /**
   * Continue a discussion with a user message. Runs the AI to generate
   * a response, extracts insights, and saves everything.
   * Non-streaming path for Telegram and other non-interactive consumers.
   */
  async continueDiscussion(
    discussionId: string,
    userMessage: string
  ): Promise<ContinueDiscussionResult> {
    const discussion = this.discussionManager.load(discussionId);
    if (!discussion) {
      throw new Error(`Discussion not found: ${discussionId}`);
    }

    const updated = this.discussionManager.addMessage(
      discussionId,
      "user",
      userMessage
    );

    const { projectContext, learnings, knowledgeBase } = this.buildContext();

    const prompt = buildFacilitatorPrompt({
      topic: updated.topic,
      projectContext,
      learnings,
      knowledgeBase,
      previousMessages: updated.messages,
      insights: updated.insights,
      isFirstMessage: false,
    });

    const response = await this.aiRunner.run(prompt);
    const { cleanResponse, insights } = this.parseInsights(response);

    // Save extracted insights
    for (const insight of insights) {
      this.discussionManager.addInsight(discussionId, insight);
    }

    // Save assistant response
    this.discussionManager.addMessage(discussionId, "assistant", cleanResponse);

    return { response: cleanResponse, insights };
  }

  /**
   * Continue a discussion with streaming support for CLI consumption.
   * Yields stream chunks in real-time and returns the final result.
   */
  async *continueDiscussionStream(
    discussionId: string,
    userMessage: string
  ): AsyncGenerator<StreamChunk, ContinueDiscussionResult, unknown> {
    const discussion = this.discussionManager.load(discussionId);
    if (!discussion) {
      throw new Error(`Discussion not found: ${discussionId}`);
    }

    const updated = this.discussionManager.addMessage(
      discussionId,
      "user",
      userMessage
    );

    const { projectContext, learnings, knowledgeBase } = this.buildContext();

    const prompt = buildFacilitatorPrompt({
      topic: updated.topic,
      projectContext,
      learnings,
      knowledgeBase,
      previousMessages: updated.messages,
      insights: updated.insights,
      isFirstMessage: false,
    });

    let fullResponse = "";
    const stream = this.aiRunner.runStream(prompt);

    for await (const chunk of stream) {
      yield chunk;

      if (chunk.type === "text_delta") {
        fullResponse += chunk.content;
      } else if (chunk.type === "result") {
        fullResponse = chunk.content;
      }
    }

    const { cleanResponse, insights } = this.parseInsights(fullResponse);

    // Save extracted insights
    for (const insight of insights) {
      this.discussionManager.addInsight(discussionId, insight);
    }

    // Save assistant response
    this.discussionManager.addMessage(discussionId, "assistant", cleanResponse);

    return { response: cleanResponse, insights };
  }

  /**
   * Generate a final summary of the discussion, save it as the last
   * assistant message, and mark the discussion as completed.
   */
  async summarizeDiscussion(discussionId: string): Promise<string> {
    const discussion = this.discussionManager.load(discussionId);
    if (!discussion) {
      throw new Error(`Discussion not found: ${discussionId}`);
    }

    this.log("Generating discussion summary...", "info");

    const prompt = buildSummaryPrompt(
      discussion.topic,
      discussion.messages,
      discussion.insights
    );

    const summary = await this.aiRunner.run(prompt);

    this.discussionManager.addMessage(discussionId, "assistant", summary);
    this.discussionManager.complete(discussionId);

    this.log("Discussion summarized and completed", "success");

    return summary;
  }

  /**
   * Extract <insight>...</insight> XML blocks from the AI response.
   * Returns the cleaned response text (with insight tags removed) and
   * the parsed insight objects.
   */
  private parseInsights(response: string): {
    cleanResponse: string;
    insights: DiscussionInsight[];
  } {
    const insights: DiscussionInsight[] = [];
    const insightRegex = /<insight>\s*([\s\S]*?)\s*<\/insight>/g;

    let match = insightRegex.exec(response);
    while (match !== null) {
      try {
        const parsed = JSON.parse(match[1]) as {
          type: DiscussionInsight["type"];
          title: string;
          content: string;
          tags?: string[];
        };

        const id = `ins-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        insights.push({
          id,
          type: parsed.type,
          title: parsed.title,
          content: parsed.content,
          tags: parsed.tags ?? [],
          createdAt: new Date().toISOString(),
        });
      } catch {
        // Skip unparseable insight blocks
      }
      match = insightRegex.exec(response);
    }

    const cleanResponse = response
      .replace(/<insight>\s*[\s\S]*?\s*<\/insight>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { cleanResponse, insights };
  }

  /**
   * Build context from project files (LOCUS.md, LEARNINGS.md).
   * Reuses the same logic as PromptBuilder.
   */
  private buildContext(): {
    projectContext: string | null;
    learnings: string | null;
    knowledgeBase: string;
  } {
    return {
      projectContext: this.getProjectContext(),
      learnings: this.getLearningsContent(),
      knowledgeBase: this.getKnowledgeBaseSection(),
    };
  }

  private getProjectContext(): string | null {
    const contextPath = getLocusPath(this.projectPath, "contextFile");
    if (existsSync(contextPath)) {
      try {
        const context = readFileSync(contextPath, "utf-8");
        if (context.trim().length > 20) {
          return context;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  private getLearningsContent(): string | null {
    const learningsPath = getLocusPath(this.projectPath, "learningsFile");
    if (!existsSync(learningsPath)) {
      return null;
    }
    try {
      const content = readFileSync(learningsPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.startsWith("- "));
      if (lines.length === 0) {
        return null;
      }
      return lines.join("\n");
    } catch {
      return null;
    }
  }

  private getKnowledgeBaseSection(): string {
    return `You have access to the following documentation directories for context:
- Artifacts: \`.locus/artifacts\` (local-only, not synced to cloud)
- Documents: \`.locus/documents\` (synced from cloud)
If you need more information about the project strategies, plans, or architecture, read files in these directories.`;
  }
}
