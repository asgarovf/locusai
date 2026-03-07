/**
 * GitHub → Linear status exporter.
 *
 * Iterates all tracked issue mappings, fetches current GitHub Issue state
 * (labels, open/closed) via `gh issue view`, reverse-maps status labels
 * to Linear workflow states, and updates Linear issues accordingly.
 */

import { execFileSync } from "node:child_process";
import { createLogger } from "@locusai/sdk";
import { LocusLinearClient } from "../client.js";
import { loadLinearConfig, validateLinearConfig } from "../config.js";
import { reverseMapPriority, reverseMapState } from "./mapper.js";
import { loadState, saveState } from "./state.js";

const logger = createLogger("linear");

export interface ExportOptions {
  dryRun?: boolean;
}

export interface ExportResult {
  updated: number;
  unchanged: number;
  errors: number;
  issues: Array<{
    linearIdentifier: string;
    githubNumber: number;
    action: "updated" | "unchanged" | "error";
    details?: string;
    error?: string;
  }>;
}

interface GitHubIssueInfo {
  state: "open" | "closed";
  labels: string[];
  updatedAt: string;
  linkedPrUrl: string | null;
}

/**
 * Run the full export flow: read GitHub Issue states, push updates to Linear.
 */
export async function runExport(
  options: ExportOptions = {}
): Promise<ExportResult> {
  const config = loadLinearConfig();
  const configError = validateLinearConfig(config);
  if (configError) {
    throw new Error(configError);
  }

  const result: ExportResult = {
    updated: 0,
    unchanged: 0,
    errors: 0,
    issues: [],
  };

  const syncState = loadState();

  if (syncState.mappings.length === 0) {
    logger.info("No issue mappings found. Run import first.");
    return result;
  }

  const client = LocusLinearClient.fromConfig();

  // Resolve workflow state IDs for reverse mapping
  const linearClient = await client.ensureFreshClient();
  const teamsConnection = await linearClient.teams();
  const team = teamsConnection.nodes.find((t) => t.key === config.teamKey);
  if (!team) {
    throw new Error(
      `Team "${config.teamKey}" not found. Run: locus pkg linear auth`
    );
  }

  const statesConnection = await team.states();
  const stateNameToId: Record<string, string> = {};
  for (const state of statesConnection.nodes) {
    stateNameToId[state.name] = state.id;
  }

  logger.info(
    `Processing ${syncState.mappings.length} mapped issues for export`
  );

  for (const mapping of syncState.mappings) {
    try {
      const ghIssue = fetchGitHubIssue(mapping.githubIssueNumber);

      // Check if GitHub issue has changed since last sync
      if (ghIssue.updatedAt <= mapping.lastSyncedAt) {
        result.unchanged++;
        result.issues.push({
          linearIdentifier: mapping.linearIdentifier,
          githubNumber: mapping.githubIssueNumber,
          action: "unchanged",
        });
        continue;
      }

      // Build Linear update payload from GitHub state
      const updatePayload: Record<string, unknown> = {};
      const changes: string[] = [];

      // Reverse-map status labels to Linear workflow state
      const linearStateName = reverseMapState(
        ghIssue.labels,
        config.stateMapping
      );
      if (linearStateName && stateNameToId[linearStateName]) {
        updatePayload.stateId = stateNameToId[linearStateName];
        changes.push(`state → ${linearStateName}`);
      }

      // Map closed GitHub issue to "Done" state (if not already mapped by label)
      if (ghIssue.state === "closed" && !linearStateName) {
        const doneStateId = stateNameToId.Done;
        if (doneStateId) {
          updatePayload.stateId = doneStateId;
          changes.push("state → Done (closed)");
        }
      }

      // Reverse-map priority labels
      for (const label of ghIssue.labels) {
        const priority = reverseMapPriority(label);
        if (priority !== null) {
          updatePayload.priority = priority;
          changes.push(`priority → ${priority}`);
          break;
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        result.unchanged++;
        result.issues.push({
          linearIdentifier: mapping.linearIdentifier,
          githubNumber: mapping.githubIssueNumber,
          action: "unchanged",
          details: "No mappable changes detected",
        });
        continue;
      }

      if (options.dryRun) {
        result.updated++;
        result.issues.push({
          linearIdentifier: mapping.linearIdentifier,
          githubNumber: mapping.githubIssueNumber,
          action: "updated",
          details: changes.join(", "),
        });
        continue;
      }

      // Update Linear issue
      await client.updateIssue(mapping.linearId, updatePayload);

      // Add linked PR as attachment if found
      if (ghIssue.linkedPrUrl) {
        try {
          await addLinearAttachment(
            linearClient,
            mapping.linearId,
            ghIssue.linkedPrUrl
          );
          changes.push(`PR attached: ${ghIssue.linkedPrUrl}`);
        } catch {
          // Non-fatal: attachment creation can fail if already exists
        }
      }

      // Update sync state timestamps
      const idx = syncState.mappings.findIndex(
        (m) => m.linearId === mapping.linearId
      );
      if (idx !== -1) {
        syncState.mappings[idx] = {
          ...syncState.mappings[idx],
          lastGithubUpdate: ghIssue.updatedAt,
          lastSyncedAt: new Date().toISOString(),
        };
      }

      result.updated++;
      result.issues.push({
        linearIdentifier: mapping.linearIdentifier,
        githubNumber: mapping.githubIssueNumber,
        action: "updated",
        details: changes.join(", "),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors++;
      result.issues.push({
        linearIdentifier: mapping.linearIdentifier,
        githubNumber: mapping.githubIssueNumber,
        action: "error",
        error: msg,
      });
      logger.info(
        `Error exporting ${mapping.linearIdentifier} (#${mapping.githubIssueNumber}): ${msg}`
      );
    }
  }

  // Persist sync state
  if (!options.dryRun) {
    syncState.lastExportAt = new Date().toISOString();
    syncState.lastSyncAt = new Date().toISOString();
    saveState(syncState);
  }

  return result;
}

// ─── GitHub Issue Fetching (via gh CLI) ────────────────────────────────────

function fetchGitHubIssue(issueNumber: number): GitHubIssueInfo {
  const output = execFileSync(
    "gh",
    [
      "issue",
      "view",
      String(issueNumber),
      "--json",
      "state,labels,updatedAt,body",
    ],
    {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  const data = JSON.parse(output) as {
    state: string;
    labels: Array<{ name: string }>;
    updatedAt: string;
    body: string;
  };

  // Extract linked PR URL from issue body (common convention)
  let linkedPrUrl: string | null = null;
  if (data.body) {
    const prMatch = data.body.match(
      /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/
    );
    if (prMatch) {
      linkedPrUrl = prMatch[0];
    }
  }

  return {
    state: data.state.toLowerCase() === "open" ? "open" : "closed",
    labels: data.labels.map((l) => l.name),
    updatedAt: data.updatedAt,
    linkedPrUrl,
  };
}

// ─── Linear Attachment ─────────────────────────────────────────────────────

async function addLinearAttachment(
  client: InstanceType<typeof import("@linear/sdk").LinearClient>,
  issueId: string,
  url: string
): Promise<void> {
  await client.createAttachment({
    issueId,
    url,
    title: "GitHub Pull Request",
  });
}
