import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { JobRun, Sprint, Suggestion, Task } from "@locusai/shared";
import type { LocusClient } from "../../index.js";

// ============================================================================
// Types
// ============================================================================

export interface ProposalContext {
  /** Recent job run results (up to 10) */
  jobRuns: JobRun[];
  /** Active sprint, if any */
  activeSprint: Sprint | null;
  /** Tasks in the current sprint */
  sprintTasks: Task[];
  /** Backlog tasks not yet assigned to a sprint */
  backlogTasks: Task[];
  /** Recent git commit log (last 20 commits) */
  gitLog: string;
  /** Product context from .locus/artifacts/ */
  artifactContents: ArtifactFile[];
  /** Project-specific instructions from .locus/LOCUS.md */
  locusInstructions: string | null;
  /** Previously skipped suggestions (for deduplication) */
  skippedSuggestions: Suggestion[];
}

export interface ArtifactFile {
  name: string;
  content: string;
}

// ============================================================================
// Context Gatherer
// ============================================================================

export class ContextGatherer {
  async gather(
    projectPath: string,
    client: LocusClient,
    workspaceId: string
  ): Promise<ProposalContext> {
    // Run API calls in parallel for efficiency
    const [jobRuns, activeSprint, allTasks, skippedSuggestions] =
      await Promise.all([
        this.fetchJobRuns(client, workspaceId),
        this.fetchActiveSprint(client, workspaceId),
        this.fetchTasks(client, workspaceId),
        this.fetchSkippedSuggestions(client, workspaceId),
      ]);

    // Split tasks into sprint vs backlog
    const sprintTasks = activeSprint
      ? allTasks.filter((t) => t.sprintId === activeSprint.id)
      : [];
    const backlogTasks = allTasks.filter((t) => !t.sprintId);

    // Local data (sync, fast)
    const gitLog = this.readGitLog(projectPath);
    const artifactContents = this.readArtifacts(projectPath);
    const locusInstructions = this.readLocusInstructions(projectPath);

    return {
      jobRuns,
      activeSprint,
      sprintTasks,
      backlogTasks,
      gitLog,
      artifactContents,
      locusInstructions,
      skippedSuggestions,
    };
  }

  // ==========================================================================
  // API Fetchers
  // ==========================================================================

  private async fetchJobRuns(
    client: LocusClient,
    workspaceId: string
  ): Promise<JobRun[]> {
    try {
      return await client.jobs.list(workspaceId, { limit: 10 });
    } catch {
      return [];
    }
  }

  private async fetchActiveSprint(
    client: LocusClient,
    workspaceId: string
  ): Promise<Sprint | null> {
    try {
      return await client.sprints.getActive(workspaceId);
    } catch {
      return null;
    }
  }

  private async fetchTasks(
    client: LocusClient,
    workspaceId: string
  ): Promise<Task[]> {
    try {
      return await client.tasks.list(workspaceId);
    } catch {
      return [];
    }
  }

  private async fetchSkippedSuggestions(
    client: LocusClient,
    workspaceId: string
  ): Promise<Suggestion[]> {
    try {
      return await client.suggestions.list(workspaceId, { status: "SKIPPED" });
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // Local Data Readers
  // ==========================================================================

  private readGitLog(projectPath: string): string {
    try {
      return execFileSync(
        "git",
        ["log", "--oneline", "--no-decorate", "-n", "20"],
        {
          cwd: projectPath,
          encoding: "utf-8",
          timeout: 10_000,
          stdio: ["pipe", "pipe", "pipe"],
        }
      ).trim();
    } catch {
      return "";
    }
  }

  private readArtifacts(projectPath: string): ArtifactFile[] {
    const artifactsDir = join(projectPath, ".locus", "artifacts");
    if (!existsSync(artifactsDir)) return [];

    try {
      const files = readdirSync(artifactsDir).filter((f) => f.endsWith(".md"));

      return files.slice(0, 10).map((name) => ({
        name,
        content: readFileSync(join(artifactsDir, name), "utf-8").slice(0, 2000),
      }));
    } catch {
      return [];
    }
  }

  private readLocusInstructions(projectPath: string): string | null {
    const locusPath = join(projectPath, ".locus", "LOCUS.md");
    if (!existsSync(locusPath)) return null;

    try {
      return readFileSync(locusPath, "utf-8").slice(0, 3000);
    } catch {
      return null;
    }
  }
}
