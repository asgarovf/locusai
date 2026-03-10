/**
 * Sync command for locus-jira.
 *
 * Pushes Locus execution results back to Jira:
 * - Transitions issue statuses based on GitHub PR state
 * - Posts execution summaries as Jira comments
 * - Links GitHub PRs to Jira issues via remote links
 *
 * Usage:
 *   locus jira sync PROJ-101 PROJ-102       → sync specific issues
 *   locus jira sync --jql "..."             → sync issues matching JQL
 *   locus jira sync --sprint                → sync active sprint issues
 *   locus jira sync --comments              → also post execution summary comments
 *   locus jira sync --dry-run               → preview without executing
 */

import { execSync } from "node:child_process";
import { JiraClient } from "../client/client.js";
import type { JiraIssue, JiraTransition } from "../client/types.js";
import { loadJiraConfig } from "../config.js";
import type { JiraConfig, TransitionOnPR } from "../types.js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SyncOptions {
  keys: string[];
  jql?: string;
  sprint?: boolean;
  comments?: boolean;
  dryRun?: boolean;
}

interface GitHubPR {
  number: number;
  title: string;
  state: string;
  url: string;
}

interface SyncAction {
  issueKey: string;
  currentStatus: string;
  targetStatus: string | null;
  transitionId: string | null;
  pr: GitHubPR | null;
  comment: string | null;
  skipped: boolean;
  skipReason?: string;
}

// ─── Arg Parsing ────────────────────────────────────────────────────────────

function parseSyncArgs(args: string[]): SyncOptions {
  const options: SyncOptions = { keys: [] };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--jql": {
        const next = args[i + 1];
        if (!next || next.startsWith("--")) {
          process.stderr.write("  --jql requires a query string.\n");
          process.exit(1);
        }
        options.jql = next;
        i++;
        break;
      }
      case "--sprint":
        options.sprint = true;
        break;
      case "--comments":
        options.comments = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        if (arg.startsWith("--")) {
          process.stderr.write(`  Unknown flag: ${arg}\n`);
          process.exit(1);
        }
        options.keys.push(arg.toUpperCase());
    }
  }

  return options;
}

// ─── GitHub PR Lookup ───────────────────────────────────────────────────────

/**
 * Search for a GitHub PR that references the given Jira issue key.
 * Uses `gh pr list --search` to find matching PRs by title or branch name.
 */
function findPRForIssue(issueKey: string): GitHubPR | null {
  try {
    const output = execSync(
      `gh pr list --search "${issueKey}" --json number,title,state,url --limit 1`,
      { encoding: "utf-8", timeout: 15_000, stdio: ["pipe", "pipe", "pipe"] }
    );

    const prs = JSON.parse(output) as Array<{
      number: number;
      title: string;
      state: string;
      url: string;
    }>;

    if (prs.length === 0) return null;

    return {
      number: prs[0].number,
      title: prs[0].title,
      state: prs[0].state.toLowerCase(),
      url: prs[0].url,
    };
  } catch {
    return null;
  }
}

// ─── Issue Fetching (reused patterns from run.ts) ───────────────────────────

async function fetchIssuesByKeys(
  client: JiraClient,
  keys: string[]
): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = [];
  for (const key of keys) {
    process.stderr.write(`  Fetching ${key}...\n`);
    const issue = await client.getIssue(key);
    issues.push(issue);
  }
  return issues;
}

async function fetchIssuesByJql(
  client: JiraClient,
  jql: string
): Promise<JiraIssue[]> {
  process.stderr.write(`  Searching: ${jql}\n`);
  const result = await client.searchIssues(jql, { fetchAll: true });
  return result.issues;
}

async function fetchSprintIssues(
  client: JiraClient,
  boardId: number
): Promise<JiraIssue[]> {
  process.stderr.write("  Fetching active sprint...\n");
  const sprint = await client.getCurrentSprint(boardId);
  if (!sprint) {
    process.stderr.write("  No active sprint found.\n\n");
    return [];
  }

  process.stderr.write(`  Sprint: ${sprint.name}\n`);
  return client.getSprintIssues(boardId, sprint.id);
}

// ─── Transition Resolution ──────────────────────────────────────────────────

/**
 * Determine the target status and transition ID for an issue based on PR state.
 * Returns null transition if no matching transition is available.
 */
function resolveTargetStatus(
  prState: string,
  transitionMap: TransitionOnPR
): string | null {
  switch (prState) {
    case "open":
      return transitionMap.created ?? null;
    case "merged":
      return transitionMap.merged ?? null;
    default:
      return null;
  }
}

function findTransitionByTargetStatus(
  transitions: JiraTransition[],
  targetStatus: string
): JiraTransition | null {
  const normalized = targetStatus.toLowerCase();
  return (
    transitions.find((t) => t.to.name.toLowerCase() === normalized) ?? null
  );
}

// ─── Sync Plan ──────────────────────────────────────────────────────────────

async function buildSyncPlan(
  client: JiraClient,
  issues: JiraIssue[],
  config: JiraConfig,
  postComments: boolean
): Promise<SyncAction[]> {
  const actions: SyncAction[] = [];

  for (const issue of issues) {
    const key = issue.key;
    const currentStatus = issue.fields.status.name;

    // Find associated GitHub PR
    process.stderr.write(`  Checking PR for ${key}...\n`);
    const pr = findPRForIssue(key);

    if (!pr) {
      actions.push({
        issueKey: key,
        currentStatus,
        targetStatus: null,
        transitionId: null,
        pr: null,
        comment: null,
        skipped: true,
        skipReason: "No GitHub PR found",
      });
      continue;
    }

    // Determine target status from PR state
    const targetStatus = resolveTargetStatus(pr.state, config.transitionOnPR);

    if (!targetStatus) {
      actions.push({
        issueKey: key,
        currentStatus,
        targetStatus: null,
        transitionId: null,
        pr,
        comment: postComments ? buildComment(pr) : null,
        skipped: false,
      });
      continue;
    }

    // Check if already in target status (idempotent)
    if (currentStatus.toLowerCase() === targetStatus.toLowerCase()) {
      actions.push({
        issueKey: key,
        currentStatus,
        targetStatus,
        transitionId: null,
        pr,
        comment: postComments ? buildComment(pr) : null,
        skipped: true,
        skipReason: `Already in "${currentStatus}"`,
      });
      continue;
    }

    // Find valid transition to target status
    const transitions = await client.getTransitions(key);
    const transition = findTransitionByTargetStatus(transitions, targetStatus);

    if (!transition) {
      actions.push({
        issueKey: key,
        currentStatus,
        targetStatus,
        transitionId: null,
        pr,
        comment: postComments ? buildComment(pr) : null,
        skipped: true,
        skipReason: `No transition to "${targetStatus}" from "${currentStatus}"`,
      });
      continue;
    }

    actions.push({
      issueKey: key,
      currentStatus,
      targetStatus,
      transitionId: transition.id,
      pr,
      comment: postComments ? buildComment(pr) : null,
      skipped: false,
    });
  }

  return actions;
}

// ─── Comment Builder ────────────────────────────────────────────────────────

function buildComment(pr: GitHubPR): string {
  const status = pr.state === "merged" ? "Merged" : "Open";
  return (
    `[Locus] Sync update\n\n` +
    `PR #${pr.number}: ${pr.title}\n` +
    `Status: ${status}\n` +
    `URL: ${pr.url}`
  );
}

// ─── Dry Run ────────────────────────────────────────────────────────────────

function printDryRun(actions: SyncAction[]): void {
  process.stderr.write(`\n  Dry run — ${actions.length} issue(s) analyzed:\n`);
  process.stderr.write(`  ${"═".repeat(70)}\n`);

  for (const action of actions) {
    if (action.skipped) {
      process.stderr.write(
        `  [skip] ${action.issueKey.padEnd(14)} ${action.skipReason}\n`
      );
      continue;
    }

    const prInfo = action.pr
      ? `PR #${action.pr.number} (${action.pr.state})`
      : "no PR";

    if (action.transitionId && action.targetStatus) {
      process.stderr.write(
        `  [move] ${action.issueKey.padEnd(14)} "${action.currentStatus}" → "${action.targetStatus}"  (${prInfo})\n`
      );
    } else {
      process.stderr.write(
        `  [link] ${action.issueKey.padEnd(14)} ${prInfo}\n`
      );
    }

    if (action.comment) {
      process.stderr.write(
        `  [cmnt] ${action.issueKey.padEnd(14)} Will post execution summary\n`
      );
    }
  }

  process.stderr.write("\n");
}

// ─── Execute Sync ───────────────────────────────────────────────────────────

async function executeSyncPlan(
  client: JiraClient,
  actions: SyncAction[]
): Promise<void> {
  let transitioned = 0;
  let commented = 0;
  let linked = 0;
  let skipped = 0;

  for (const action of actions) {
    if (action.skipped) {
      process.stderr.write(
        `  [skip] ${action.issueKey.padEnd(14)} ${action.skipReason}\n`
      );
      skipped++;
      continue;
    }

    // Transition issue status
    if (action.transitionId && action.targetStatus) {
      try {
        await client.transitionIssue(action.issueKey, action.transitionId);
        process.stderr.write(
          `  [move] ${action.issueKey.padEnd(14)} "${action.currentStatus}" → "${action.targetStatus}"\n`
        );
        transitioned++;
      } catch {
        process.stderr.write(
          `  [warn] ${action.issueKey.padEnd(14)} Failed to transition to "${action.targetStatus}"\n`
        );
      }
    }

    // Link PR to issue
    if (action.pr) {
      try {
        await client.addRemoteLink(
          action.issueKey,
          `PR #${action.pr.number}: ${action.pr.title}`,
          action.pr.url
        );
        process.stderr.write(
          `  [link] ${action.issueKey.padEnd(14)} Linked PR #${action.pr.number}\n`
        );
        linked++;
      } catch {
        process.stderr.write(
          `  [warn] ${action.issueKey.padEnd(14)} Failed to add PR link (may already exist)\n`
        );
      }
    }

    // Post comment
    if (action.comment) {
      try {
        await client.addComment(action.issueKey, action.comment);
        process.stderr.write(
          `  [cmnt] ${action.issueKey.padEnd(14)} Posted execution summary\n`
        );
        commented++;
      } catch {
        process.stderr.write(
          `  [warn] ${action.issueKey.padEnd(14)} Failed to post comment\n`
        );
      }
    }
  }

  // Summary
  process.stderr.write(`\n  ${"─".repeat(70)}\n`);
  process.stderr.write(
    `  Sync complete: ${transitioned} transitioned, ${linked} linked, ${commented} commented, ${skipped} skipped\n\n`
  );
}

// ─── Command Entry ──────────────────────────────────────────────────────────

export async function syncCommand(args: string[]): Promise<void> {
  const options = parseSyncArgs(args);
  const config = loadJiraConfig();

  // Respect syncBack: false
  if (!config.syncBack) {
    process.stderr.write(
      '\n  Sync is disabled. Set "syncBack": true in .locus/config.json under packages.jira\n\n'
    );
    process.exit(1);
  }

  const client = JiraClient.fromConfig();

  // Fetch issues based on mode
  let jiraIssues: JiraIssue[];

  if (options.keys.length > 0) {
    jiraIssues = await fetchIssuesByKeys(client, options.keys);
  } else if (options.jql) {
    jiraIssues = await fetchIssuesByJql(client, options.jql);
  } else if (options.sprint) {
    if (!config.boardId) {
      process.stderr.write(
        "\n  No board configured. Run: locus jira board\n\n"
      );
      process.exit(1);
    }
    jiraIssues = await fetchSprintIssues(client, config.boardId);
  } else {
    process.stderr.write(
      "\n  Usage: locus jira sync <KEY...> | --jql <query> | --sprint\n" +
        "  Run 'locus jira help' for details.\n\n"
    );
    process.exit(1);
  }

  if (jiraIssues.length === 0) {
    process.stderr.write("\n  No issues found.\n\n");
    return;
  }

  process.stderr.write(`\n  ${jiraIssues.length} issue(s) to sync\n`);
  process.stderr.write(`  ${"─".repeat(70)}\n`);

  // Build sync plan
  const actions = await buildSyncPlan(
    client,
    jiraIssues,
    config,
    options.comments ?? false
  );

  // Dry run mode
  if (options.dryRun) {
    printDryRun(actions);
    return;
  }

  // Execute sync plan
  await executeSyncPlan(client, actions);
}
