/**
 * Linear → GitHub issue importer.
 *
 * Fetches issues from Linear (with team, cycle, project, state, priority filters),
 * maps fields via mapper.ts, creates/updates GitHub Issues via `gh` CLI,
 * and tracks sync state for incremental imports.
 */

import { execFileSync } from "node:child_process";
import { createLogger } from "@locusai/sdk";
import { LocusLinearClient } from "../client.js";
import { loadLinearConfig, validateLinearConfig } from "../config.js";
import type { IssueMapping, LinearConfig, LinearIssue } from "../types.js";
import { buildGitHubIssuePayload } from "./mapper.js";
import { getMapping, loadState, saveState } from "./state.js";

const logger = createLogger("linear");

export interface ImportOptions {
  cycle?: boolean;
  project?: string;
  dryRun?: boolean;
  enrich?: boolean;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  issues: Array<{
    identifier: string;
    title: string;
    action: "created" | "updated" | "skipped" | "error";
    githubNumber?: number;
    error?: string;
  }>;
}

/**
 * Run the full import flow: fetch from Linear, create/update GitHub Issues.
 */
export async function runImport(
  options: ImportOptions = {}
): Promise<ImportResult> {
  const config = loadLinearConfig();
  const configError = validateLinearConfig(config);
  if (configError) {
    throw new Error(configError);
  }

  const client = LocusLinearClient.fromConfig();
  const linearClient = await client.ensureFreshClient();

  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    issues: [],
  };

  // Resolve team ID from team key
  const teamsConnection = await linearClient.teams();
  const team = teamsConnection.nodes.find((t) => t.key === config.teamKey);
  if (!team) {
    throw new Error(
      `Team "${config.teamKey}" not found. Run: locus pkg linear auth`
    );
  }

  // Resolve cycle filter
  let cycleId: string | undefined;
  if (options.cycle) {
    const cyclesConnection = await team.cycles({
      filter: { isActive: { eq: true } },
    });
    const activeCycle = cyclesConnection.nodes[0];
    if (!activeCycle) {
      throw new Error("No active cycle found for this team.");
    }
    cycleId = activeCycle.id;
    logger.info(`Filtering to active cycle: ${activeCycle.number}`);
  }

  // Resolve project filter
  let projectId: string | undefined;
  if (options.project) {
    const projectsConnection = await team.projects();
    const project = projectsConnection.nodes.find(
      (p) => p.name.toLowerCase() === options.project?.toLowerCase()
    );
    if (!project) {
      throw new Error(
        `Project "${options.project}" not found. Available projects: ${projectsConnection.nodes.map((p) => p.name).join(", ")}`
      );
    }
    projectId = project.id;
    logger.info(`Filtering to project: ${project.name}`);
  }

  // Fetch all issues with pagination
  const linearIssues = await fetchAllIssues(client, team.id, config, {
    cycleId,
    projectId,
  });

  logger.info(`Found ${linearIssues.length} Linear issues to process`);

  if (linearIssues.length === 0) {
    return result;
  }

  const syncState = loadState();

  for (let i = 0; i < linearIssues.length; i++) {
    const issue = linearIssues[i];
    const existing = getMapping(syncState, issue.id);

    try {
      if (existing) {
        // Check if changed since last sync
        if (issue.updatedAt <= existing.lastSyncedAt) {
          result.skipped++;
          result.issues.push({
            identifier: issue.identifier,
            title: issue.title,
            action: "skipped",
            githubNumber: existing.githubIssueNumber,
          });
          continue;
        }

        // Update existing GitHub issue
        if (options.dryRun) {
          result.updated++;
          result.issues.push({
            identifier: issue.identifier,
            title: issue.title,
            action: "updated",
            githubNumber: existing.githubIssueNumber,
          });
          continue;
        }

        const payload = buildGitHubIssuePayload(issue, {
          stateMapping: config.stateMapping,
          labelMapping: config.labelMapping,
          userMapping: config.userMapping,
        });

        updateGitHubIssue(existing.githubIssueNumber, payload, i + 1);

        // Update sync state
        const idx = syncState.mappings.findIndex(
          (m) => m.linearId === issue.id
        );
        if (idx !== -1) {
          syncState.mappings[idx] = {
            ...syncState.mappings[idx],
            lastLinearUpdate: issue.updatedAt,
            lastSyncedAt: new Date().toISOString(),
          };
        }

        result.updated++;
        result.issues.push({
          identifier: issue.identifier,
          title: issue.title,
          action: "updated",
          githubNumber: existing.githubIssueNumber,
        });
      } else {
        // Create new GitHub issue
        if (options.dryRun) {
          result.created++;
          result.issues.push({
            identifier: issue.identifier,
            title: issue.title,
            action: "created",
          });
          continue;
        }

        const payload = buildGitHubIssuePayload(issue, {
          stateMapping: config.stateMapping,
          labelMapping: config.labelMapping,
          userMapping: config.userMapping,
        });

        const githubNumber = createGitHubIssue(payload, i + 1);

        // Record mapping
        const mapping: IssueMapping = {
          linearId: issue.id,
          linearIdentifier: issue.identifier,
          githubIssueNumber: githubNumber,
          lastLinearUpdate: issue.updatedAt,
          lastGithubUpdate: new Date().toISOString(),
          lastSyncedAt: new Date().toISOString(),
        };
        syncState.mappings.push(mapping);

        result.created++;
        result.issues.push({
          identifier: issue.identifier,
          title: issue.title,
          action: "created",
          githubNumber,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors++;
      result.issues.push({
        identifier: issue.identifier,
        title: issue.title,
        action: "error",
        error: msg,
      });
      logger.info(`Error processing ${issue.identifier}: ${msg}`);
    }
  }

  // Persist sync state
  if (!options.dryRun) {
    syncState.lastImportAt = new Date().toISOString();
    syncState.lastSyncAt = new Date().toISOString();
    saveState(syncState);
  }

  return result;
}

// ─── Linear Issue Fetching ──────────────────────────────────────────────────

interface FetchFilters {
  cycleId?: string;
  projectId?: string;
}

async function fetchAllIssues(
  client: LocusLinearClient,
  teamId: string,
  config: LinearConfig,
  filters: FetchFilters
): Promise<LinearIssue[]> {
  const issues: LinearIssue[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const filter: Record<string, unknown> = {
      team: { id: { eq: teamId } },
    };

    // Apply state filter from config
    if (config.importFilter.states.length > 0) {
      filter.state = { name: { in: config.importFilter.states } };
    }

    // Apply priority filter from config
    if (config.importFilter.priorities.length > 0) {
      filter.priority = { in: config.importFilter.priorities };
    }

    // Apply cycle filter
    if (filters.cycleId) {
      filter.cycle = { id: { eq: filters.cycleId } };
    }

    // Apply project filter
    if (filters.projectId) {
      filter.project = { id: { eq: filters.projectId } };
    }

    const variables: Record<string, unknown> = {
      first: 50,
      filter,
    };
    if (cursor) {
      variables.after = cursor;
    }

    const connection = await client.getIssues(variables);
    const nodes = connection.nodes;

    for (const node of nodes) {
      const stateObj = await node.state;
      const labelsConnection = await node.labels();
      const labelNames = labelsConnection.nodes.map((l) => l.name);
      const assignee = await node.assignee;

      issues.push({
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        description: node.description ?? null,
        priority: node.priority,
        state: stateObj?.name ?? "Unknown",
        labels: labelNames,
        assigneeId: assignee?.id ?? null,
        projectId: null,
        cycleId: null,
        parentId: null,
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString(),
        url: node.url,
      });
    }

    const pageInfo = connection.pageInfo;
    hasMore = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor ?? undefined;
  }

  // Sort by sort order (priority, then creation date)
  issues.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return issues;
}

// ─── GitHub Issue Operations (via gh CLI) ────────────────────────────────────

function createGitHubIssue(
  payload: {
    title: string;
    body: string;
    labels: string[];
    assignee: string | null;
  },
  order: number
): number {
  const args = [
    "issue",
    "create",
    "--title",
    payload.title,
    "--body-file",
    "-",
  ];

  for (const label of payload.labels) {
    args.push("--label", label);
  }

  // Add order label
  args.push("--label", `order:${order}`);

  if (payload.assignee) {
    args.push("--assignee", payload.assignee);
  }

  const result = execFileSync("gh", args, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    input: payload.body,
  });

  const match = result.match(/\/issues\/(\d+)/);
  if (!match) {
    throw new Error(`Could not extract issue number from gh output: ${result}`);
  }

  return Number.parseInt(match[1], 10);
}

function updateGitHubIssue(
  issueNumber: number,
  payload: {
    title: string;
    body: string;
    labels: string[];
    assignee: string | null;
  },
  order: number
): void {
  const args = [
    "issue",
    "edit",
    String(issueNumber),
    "--title",
    payload.title,
    "--body-file",
    "-",
  ];

  // gh issue edit uses --add-label, but we want to set exact labels.
  // Clear approach: add all desired labels. gh handles duplicates gracefully.
  const allLabels = [...payload.labels, `order:${order}`];
  for (const label of allLabels) {
    args.push("--add-label", label);
  }

  if (payload.assignee) {
    args.push("--assignee", payload.assignee);
  }

  execFileSync("gh", args, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    input: payload.body,
  });
}
