/**
 * GitHub CLI wrapper — all `gh` interactions go through this module.
 * Integrates with the rate limiter for every API call.
 */

import {
  type ExecFileSyncOptionsWithStringEncoding,
  type ExecSyncOptions,
  execFileSync,
  execSync,
} from "node:child_process";
import type {
  Issue,
  LabelDef,
  Milestone,
  PRComment,
  PullRequest,
} from "../types.js";
import { getLogger } from "./logger.js";
import { getRateLimiter } from "./rate-limiter.js";

// ─── Core gh Execution ───────────────────────────────────────────────────────

interface GhOptions {
  cwd?: string;
  /** If true, throw on non-zero exit (default: true). */
  throwOnError?: boolean;
}

/** Execute a `gh` CLI command and return stdout. */
export function gh(args: string, options: GhOptions = {}): string {
  const log = getLogger();
  const cwd = options.cwd ?? process.cwd();
  const throwOnError = options.throwOnError ?? true;

  log.debug(`gh ${args}`, { cwd });
  const startTime = Date.now();

  try {
    const result = execSync(`gh ${args}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    } satisfies ExecSyncOptions);

    const duration = Date.now() - startTime;
    log.debug(`gh completed`, { args, duration });

    // Track API call in rate limiter
    getRateLimiter().updateFromHeaders({});

    return result;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const err = error as { stderr?: string; status?: number; message?: string };
    const stderr = err.stderr ?? err.message ?? "Unknown error";

    log.debug(`gh failed`, { args, duration, exitCode: err.status, stderr });

    // Check for rate limit errors
    if (
      stderr.includes("rate limit") ||
      stderr.includes("403") ||
      stderr.includes("secondary rate limit")
    ) {
      log.error("GitHub API rate limit hit", { args });
    }

    if (throwOnError) {
      throw new Error(`gh ${args} failed: ${stderr.trim()}`);
    }

    return "";
  }
}

/** Execute `gh` with argv array (no shell interpolation), optionally piping stdin. */
function ghExec(
  args: string[],
  options: GhOptions = {},
  input?: string
): string {
  const log = getLogger();
  const cwd = options.cwd ?? process.cwd();
  const throwOnError = options.throwOnError ?? true;

  log.debug(`gh ${args.map((arg) => JSON.stringify(arg)).join(" ")}`, { cwd });
  const startTime = Date.now();

  try {
    const result = execFileSync("gh", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
      input,
    } satisfies ExecFileSyncOptionsWithStringEncoding);

    const duration = Date.now() - startTime;
    log.debug("gh completed", { args: args.join(" "), duration });

    getRateLimiter().updateFromHeaders({});
    return result;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const err = error as {
      stderr?: string | Buffer;
      status?: number;
      message?: string;
    };
    const stderr =
      typeof err.stderr === "string"
        ? err.stderr
        : err.stderr instanceof Buffer
          ? err.stderr.toString("utf-8")
          : (err.message ?? "Unknown error");

    log.debug("gh failed", {
      args: args.join(" "),
      duration,
      exitCode: err.status,
      stderr,
    });

    if (
      stderr.includes("rate limit") ||
      stderr.includes("403") ||
      stderr.includes("secondary rate limit")
    ) {
      log.error("GitHub API rate limit hit", { args: args.join(" ") });
    }

    if (throwOnError) {
      throw new Error(`gh ${args.join(" ")} failed: ${stderr.trim()}`);
    }

    return "";
  }
}

/** Execute a `gh api` call and return parsed JSON. */
export function ghApi<T = unknown>(
  endpoint: string,
  options: GhOptions & { method?: string; fields?: Record<string, string> } = {}
): T {
  const method = options.method ?? "GET";
  let args = `api ${endpoint}`;

  if (method !== "GET") {
    args += ` -X ${method}`;
  }

  if (options.fields) {
    for (const [key, value] of Object.entries(options.fields)) {
      args += ` -f ${key}=${JSON.stringify(value)}`;
    }
  }

  const result = gh(args, options);
  if (!result.trim()) return {} as T;

  try {
    return JSON.parse(result);
  } catch {
    throw new Error(`Failed to parse gh api response: ${result.slice(0, 200)}`);
  }
}

// ─── Issue Operations ────────────────────────────────────────────────────────

export function createIssue(
  title: string,
  body: string,
  labels: string[],
  milestone?: string,
  options: GhOptions = {}
): number {
  const args = ["issue", "create", "--title", title, "--body-file", "-"];

  for (const label of labels) {
    args.push("--label", label);
  }
  if (milestone) {
    args.push("--milestone", milestone);
  }

  const result = ghExec(args, options, body);

  // gh issue create outputs the URL, extract the issue number
  const match = result.match(/\/issues\/(\d+)/);
  if (!match) {
    throw new Error(`Could not extract issue number from: ${result}`);
  }
  return Number.parseInt(match[1], 10);
}

export function listIssues(
  filters: {
    milestone?: string;
    label?: string;
    state?: "open" | "closed" | "all";
    assignee?: string;
    limit?: number;
  } = {},
  options: GhOptions = {}
): Issue[] {
  let args =
    "issue list --json number,title,body,state,labels,milestone,assignees,url,createdAt,updatedAt";

  if (filters.milestone)
    args += ` --milestone ${JSON.stringify(filters.milestone)}`;
  if (filters.label) args += ` --label ${JSON.stringify(filters.label)}`;
  if (filters.state) args += ` --state ${filters.state}`;
  if (filters.assignee)
    args += ` --assignee ${JSON.stringify(filters.assignee)}`;
  args += ` --limit ${filters.limit ?? 100}`;

  const result = gh(args, options);
  if (!result.trim()) return [];

  const raw = JSON.parse(result) as Array<{
    number: number;
    title: string;
    body: string;
    state: string;
    labels: Array<{ name: string }>;
    milestone: { title: string } | null;
    assignees: Array<{ login: string }>;
    url: string;
    createdAt: string;
    updatedAt: string;
  }>;

  return raw.map((issue) => ({
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state as "open" | "closed",
    labels: issue.labels.map((l) => l.name),
    milestone: issue.milestone?.title ?? null,
    assignees: issue.assignees.map((a) => a.login),
    url: issue.url,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  }));
}

export function getIssue(number: number, options: GhOptions = {}): Issue {
  const result = gh(
    `issue view ${number} --json number,title,body,state,labels,milestone,assignees,url,createdAt,updatedAt`,
    options
  );

  const raw = JSON.parse(result);
  return {
    number: raw.number,
    title: raw.title,
    body: raw.body,
    state: raw.state,
    labels: raw.labels.map((l: { name: string }) => l.name),
    milestone: raw.milestone?.title ?? null,
    assignees: raw.assignees.map((a: { login: string }) => a.login),
    url: raw.url,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function updateIssueLabels(
  number: number,
  addLabels: string[],
  removeLabels: string[],
  options: GhOptions = {}
): void {
  let args = `issue edit ${number}`;
  for (const label of addLabels) {
    args += ` --add-label ${JSON.stringify(label)}`;
  }
  for (const label of removeLabels) {
    args += ` --remove-label ${JSON.stringify(label)}`;
  }
  gh(args, options);
}

export function addIssueComment(
  number: number,
  body: string,
  options: GhOptions = {}
): void {
  gh(`issue comment ${number} --body ${JSON.stringify(body)}`, options);
}

// ─── Milestone Operations ────────────────────────────────────────────────────

export function createMilestone(
  owner: string,
  repo: string,
  title: string,
  dueOn?: string,
  description?: string,
  options: GhOptions = {}
): number {
  let args = `api repos/${owner}/${repo}/milestones -f title=${JSON.stringify(title)}`;
  if (dueOn) args += ` -f due_on=${JSON.stringify(dueOn)}`;
  if (description) args += ` -f description=${JSON.stringify(description)}`;

  const result = gh(args, options);
  const parsed = JSON.parse(result);
  return parsed.number;
}

export function listMilestones(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
  options: GhOptions = {}
): Milestone[] {
  const perPage = 100;
  const milestones: Milestone[] = [];

  for (let page = 1; ; page++) {
    const endpoint = `repos/${owner}/${repo}/milestones?state=${state}&sort=due_on&direction=asc&per_page=${perPage}&page=${page}`;
    const result = ghExec(["api", endpoint], options);

    if (!result.trim()) break;

    const parsed = JSON.parse(result);
    if (!Array.isArray(parsed) || parsed.length === 0) break;

    const raw = parsed as Array<{
      number: number;
      title: string;
      description: string;
      state: string;
      due_on: string | null;
      open_issues: number;
      closed_issues: number;
    }>;

    milestones.push(
      ...raw.map((m) => ({
        number: m.number,
        title: m.title,
        description: m.description ?? "",
        state: m.state as "open" | "closed",
        dueOn: m.due_on,
        openIssues: m.open_issues,
        closedIssues: m.closed_issues,
      }))
    );

    if (raw.length < perPage) break;
  }

  return milestones;
}

export function closeMilestone(
  owner: string,
  repo: string,
  milestoneNumber: number,
  options: GhOptions = {}
): void {
  gh(
    `api repos/${owner}/${repo}/milestones/${milestoneNumber} -X PATCH -f state=closed`,
    options
  );
}

export function reopenMilestone(
  owner: string,
  repo: string,
  milestoneNumber: number,
  options: GhOptions = {}
): void {
  gh(
    `api repos/${owner}/${repo}/milestones/${milestoneNumber} -X PATCH -f state=open`,
    options
  );
}

// ─── Pull Request Operations ─────────────────────────────────────────────────

export function createPR(
  title: string,
  body: string,
  head: string,
  base: string,
  options: GhOptions = {}
): number {
  const result = gh(
    `pr create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --head ${JSON.stringify(head)} --base ${JSON.stringify(base)}`,
    options
  );

  const match = result.match(/\/pull\/(\d+)/);
  if (!match) {
    throw new Error(`Could not extract PR number from: ${result}`);
  }
  return Number.parseInt(match[1], 10);
}

export function listPRs(
  filters: {
    label?: string;
    state?: "open" | "closed" | "merged" | "all";
  } = {},
  options: GhOptions = {}
): PullRequest[] {
  let args =
    "pr list --json number,title,body,state,headRefName,baseRefName,labels,url,createdAt";
  if (filters.label) args += ` --label ${JSON.stringify(filters.label)}`;
  if (filters.state) args += ` --state ${filters.state}`;
  args += " --limit 100";

  const result = gh(args, options);
  if (!result.trim()) return [];

  const raw = JSON.parse(result) as Array<{
    number: number;
    title: string;
    body: string;
    state: string;
    headRefName: string;
    baseRefName: string;
    labels: Array<{ name: string }>;
    url: string;
    createdAt: string;
  }>;

  return raw.map((pr) => ({
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state as "open" | "closed" | "merged",
    head: pr.headRefName,
    base: pr.baseRefName,
    labels: pr.labels.map((l) => l.name),
    url: pr.url,
    createdAt: pr.createdAt,
  }));
}

export function getPRDiff(number: number, options: GhOptions = {}): string {
  return gh(`pr diff ${number}`, options);
}

export function getPRComments(
  owner: string,
  repo: string,
  prNumber: number,
  options: GhOptions = {}
): PRComment[] {
  // Get review line comments
  const reviewComments = gh(
    `api repos/${owner}/${repo}/pulls/${prNumber}/comments`,
    options
  );

  // Get general comments
  const issueComments = gh(
    `api repos/${owner}/${repo}/issues/${prNumber}/comments`,
    options
  );

  const comments: PRComment[] = [];

  if (reviewComments.trim()) {
    const parsed = JSON.parse(reviewComments) as Array<{
      id: number;
      body: string;
      user: { login: string };
      created_at: string;
      path?: string;
      line?: number;
    }>;
    for (const c of parsed) {
      comments.push({
        id: c.id,
        body: c.body,
        user: c.user.login,
        createdAt: c.created_at,
        path: c.path,
        line: c.line,
      });
    }
  }

  if (issueComments.trim()) {
    const parsed = JSON.parse(issueComments) as Array<{
      id: number;
      body: string;
      user: { login: string };
      created_at: string;
    }>;
    for (const c of parsed) {
      comments.push({
        id: c.id,
        body: c.body,
        user: c.user.login,
        createdAt: c.created_at,
      });
    }
  }

  return comments.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

// ─── Label Operations ────────────────────────────────────────────────────────

export function ensureLabels(
  labels: LabelDef[],
  options: GhOptions = {}
): void {
  const log = getLogger();

  // Get existing labels
  let existingLabels: string[] = [];
  try {
    const result = gh("label list --json name --limit 200", options);
    if (result.trim()) {
      existingLabels = (JSON.parse(result) as Array<{ name: string }>).map(
        (l) => l.name
      );
    }
  } catch {
    log.verbose("Could not fetch existing labels, will create all");
  }

  for (const label of labels) {
    if (existingLabels.includes(label.name)) {
      log.verbose(`Label "${label.name}" already exists`);
      continue;
    }

    try {
      gh(
        `label create ${JSON.stringify(label.name)} --color ${label.color} --description ${JSON.stringify(label.description)}`,
        options
      );
      log.info(`Created label "${label.name}"`);
    } catch (e) {
      log.warn(`Failed to create label "${label.name}": ${e}`);
    }
  }
}

export function ensureOrderLabel(n: number, options: GhOptions = {}): void {
  try {
    gh(
      `label create "order:${n}" --color CCCCCC --description "Sprint execution order ${n}"`,
      { ...options, throwOnError: false }
    );
  } catch {
    // Label may already exist — that's fine
  }
}

// ─── Repository ──────────────────────────────────────────────────────────────

export function getRepoInfo(options: GhOptions = {}): {
  owner: string;
  repo: string;
  defaultBranch: string;
} {
  const result = gh("repo view --json owner,name,defaultBranchRef", options);
  const parsed = JSON.parse(result);
  return {
    owner: parsed.owner.login,
    repo: parsed.name,
    defaultBranch: parsed.defaultBranchRef.name,
  };
}
