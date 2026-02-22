import { type Suggestion, SuggestionType } from "@locusai/shared";
import { createAiRunner } from "../../ai/factory.js";
import type { LocusClient } from "../../index.js";
import { ContextGatherer, type ProposalContext } from "./context-gatherer.js";

// ============================================================================
// Types
// ============================================================================

interface ParsedProposal {
  title: string;
  description: string;
  complexity: string;
  relatedBacklogItem: string | null;
}

// ============================================================================
// Proposal Engine
// ============================================================================

export class ProposalEngine {
  private readonly contextGatherer: ContextGatherer;

  constructor(contextGatherer?: ContextGatherer) {
    this.contextGatherer = contextGatherer ?? new ContextGatherer();
  }

  /**
   * Full proposal cycle: gather context → generate proposals → create suggestions.
   */
  async runProposalCycle(
    projectPath: string,
    client: LocusClient,
    workspaceId: string
  ): Promise<Suggestion[]> {
    const context = await this.contextGatherer.gather(
      projectPath,
      client,
      workspaceId
    );
    return this.generateProposals(context, projectPath, client, workspaceId);
  }

  /**
   * Generate proposals from gathered context, deduplicate, and create suggestions.
   */
  async generateProposals(
    context: ProposalContext,
    projectPath: string,
    client: LocusClient,
    workspaceId: string
  ): Promise<Suggestion[]> {
    const prompt = this.buildPrompt(context);

    const runner = createAiRunner(undefined, {
      projectPath,
      timeoutMs: 5 * 60 * 1000,
      maxTurns: 1,
    });

    let aiResponse: string;
    try {
      aiResponse = await runner.run(prompt);
    } catch {
      return [];
    }

    const proposals = this.parseResponse(aiResponse);
    const created: Suggestion[] = [];

    for (const proposal of proposals) {
      // Deduplication: skip if a SKIPPED suggestion with a similar title exists
      if (this.isDuplicate(proposal.title, context.skippedSuggestions)) {
        continue;
      }

      try {
        const suggestion = await client.suggestions.create(workspaceId, {
          type: SuggestionType.NEXT_STEP,
          title: proposal.title,
          description: proposal.description,
          metadata: {
            complexity: proposal.complexity,
            relatedBacklogItem: proposal.relatedBacklogItem,
            source: "proposal-engine",
          },
        });
        created.push(suggestion);
      } catch {
        // Skip individual suggestion creation failures
      }
    }

    return created;
  }

  // ==========================================================================
  // Prompt Building
  // ==========================================================================

  private buildPrompt(context: ProposalContext): string {
    const sections: string[] = [];

    sections.push(
      "You are a proactive software engineering advisor. Based on the project context below, propose 1-3 high-value next steps the team should take. Focus on actionable, impactful work."
    );

    // Recent job results
    if (context.jobRuns.length > 0) {
      const jobSummaries = context.jobRuns
        .filter((j) => j.result)
        .map(
          (j) =>
            `- [${j.jobType}] ${j.status}: ${j.result?.summary ?? "No summary"} (${j.result?.filesChanged ?? 0} files changed)`
        )
        .join("\n");

      if (jobSummaries) {
        sections.push(`## Recent Job Results\n${jobSummaries}`);
      }
    }

    // Sprint state
    if (context.activeSprint) {
      const sprintInfo = `Sprint: ${context.activeSprint.name} (${context.activeSprint.status})`;
      const tasksByStatus = this.groupTasksByStatus(context.sprintTasks);
      sections.push(`## Current Sprint\n${sprintInfo}\n${tasksByStatus}`);
    }

    // Backlog
    if (context.backlogTasks.length > 0) {
      const backlogList = context.backlogTasks
        .slice(0, 15)
        .map(
          (t) =>
            `- [${t.priority}] ${t.title}${t.description ? `: ${t.description.slice(0, 100)}` : ""}`
        )
        .join("\n");
      sections.push(`## Backlog Items\n${backlogList}`);
    }

    // Git history
    if (context.gitLog) {
      sections.push(`## Recent Commits (last 20)\n${context.gitLog}`);
    }

    // Product context
    if (context.artifactContents.length > 0) {
      const artifacts = context.artifactContents
        .map((a) => `### ${a.name}\n${a.content}`)
        .join("\n\n");
      sections.push(`## Product Context\n${artifacts}`);
    }

    // Project instructions
    if (context.locusInstructions) {
      sections.push(`## Project Instructions\n${context.locusInstructions}`);
    }

    // Skipped suggestions (so AI avoids re-proposing)
    if (context.skippedSuggestions.length > 0) {
      const skipped = context.skippedSuggestions
        .map((s) => `- ${s.title}`)
        .join("\n");
      sections.push(
        `## Previously Skipped Proposals (do NOT re-propose these)\n${skipped}`
      );
    }

    // Output instructions
    sections.push(`## Instructions
Propose 1-3 high-value next steps. For each, respond with exactly this format:

PROPOSAL_START
Title: <clear, concise title>
Description: <what to do and why, 2-4 sentences>
Complexity: <low|medium|high>
Related Backlog: <title of related backlog item, or "none">
PROPOSAL_END

Rules:
- Focus on what would deliver the most value right now
- Consider what the recent job results revealed (bugs, tech debt, missing tests)
- Align with the current sprint goals when possible
- Don't propose things that are already in progress
- Don't re-propose previously skipped suggestions
- Keep proposals specific and actionable`);

    return sections.join("\n\n");
  }

  // ==========================================================================
  // Response Parsing
  // ==========================================================================

  private parseResponse(response: string): ParsedProposal[] {
    const proposals: ParsedProposal[] = [];
    const blocks = response.split("PROPOSAL_START");

    for (const block of blocks) {
      const endIdx = block.indexOf("PROPOSAL_END");
      if (endIdx === -1) continue;

      const content = block.slice(0, endIdx).trim();

      const title = this.extractField(content, "Title");
      const description = this.extractField(content, "Description");
      const complexity = this.extractField(content, "Complexity") ?? "medium";
      const relatedRaw = this.extractField(content, "Related Backlog");
      const relatedBacklogItem =
        relatedRaw && relatedRaw.toLowerCase() !== "none" ? relatedRaw : null;

      if (title && description) {
        proposals.push({
          title: title.slice(0, 200),
          description: description.slice(0, 2000),
          complexity: complexity.toLowerCase(),
          relatedBacklogItem,
        });
      }
    }

    // Cap at 3 proposals
    return proposals.slice(0, 3);
  }

  private extractField(content: string, field: string): string | null {
    const regex = new RegExp(`^${field}:\\s*(.+)`, "im");
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  // ==========================================================================
  // Deduplication
  // ==========================================================================

  private isDuplicate(title: string, skipped: Suggestion[]): boolean {
    const normalized = title.toLowerCase().trim();
    return skipped.some((s) => {
      const skippedNorm = s.title.toLowerCase().trim();
      // Exact match or high overlap via substring containment
      return (
        skippedNorm === normalized ||
        skippedNorm.includes(normalized) ||
        normalized.includes(skippedNorm)
      );
    });
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private groupTasksByStatus(tasks: { status: string }[]): string {
    const groups: Record<string, number> = {};
    for (const t of tasks) {
      groups[t.status] = (groups[t.status] ?? 0) + 1;
    }

    return Object.entries(groups)
      .map(([status, count]) => `- ${status}: ${count} task(s)`)
      .join("\n");
  }
}
