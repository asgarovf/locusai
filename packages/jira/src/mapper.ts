/**
 * Issue mapper for @locusai/locus-jira.
 *
 * Converts Jira issues into Locus's internal LocusIssue format,
 * consumed by `locus run`, `locus plan`, and `locus iterate`.
 */

import { adfToMarkdown } from "./client/adf-to-md.js";
import type { ADFNode, JiraComment, JiraIssue } from "./client/types.js";
import type { JiraConfig } from "./types.js";

// ─── LocusIssue ─────────────────────────────────────────────────────────────

export interface LocusIssue {
  id: string;
  title: string;
  description: string;
  labels: string[];
  priority: string;
  assignee?: string;
  url: string;
  comments?: string[];
}

// ─── Priority Mapping ───────────────────────────────────────────────────────

const PRIORITY_MAP: Record<string, string> = {
  Highest: "p:critical",
  High: "p:high",
  Medium: "p:medium",
  Low: "p:low",
  Lowest: "p:lowest",
};

const DEFAULT_PRIORITY = "p:medium";
const DEFAULT_COMMENT_COUNT = 5;

/**
 * Map a Jira priority name to a Locus priority label.
 */
function mapPriority(priorityName: string | null | undefined): string {
  if (!priorityName) return DEFAULT_PRIORITY;
  return PRIORITY_MAP[priorityName] ?? DEFAULT_PRIORITY;
}

// ─── Description ────────────────────────────────────────────────────────────

/**
 * Convert a Jira description field to Markdown.
 * Handles ADF objects, raw strings, and null/undefined.
 */
function convertDescription(
  description: ADFNode | string | null | undefined
): string {
  if (!description) return "";
  if (typeof description === "string") return description;
  return adfToMarkdown(description);
}

// ─── Assignee ───────────────────────────────────────────────────────────────

/**
 * Resolve a Jira assignee to a GitHub username.
 * Looks up accountId in config.userMapping, falls back to displayName.
 */
function resolveAssignee(
  assignee: JiraIssue["fields"]["assignee"],
  userMapping: Record<string, string>
): string | undefined {
  if (!assignee) return undefined;
  // Cloud uses accountId, Server/DC uses name
  const lookupKey = assignee.accountId ?? assignee.name;
  if (lookupKey) {
    const mapped = userMapping[lookupKey];
    if (mapped) return mapped;
  }
  return assignee.displayName;
}

// ─── Issue URL ──────────────────────────────────────────────────────────────

/**
 * Construct the browse URL for a Jira issue.
 * For OAuth credentials (Cloud), uses the stored baseUrl from config.
 * For API Token and PAT, uses auth.baseUrl directly.
 */
function buildIssueUrl(issueKey: string, config: JiraConfig): string {
  const auth = config.auth;
  if (!auth) return issueKey;

  if (auth.method === "oauth") {
    // OAuth doesn't have baseUrl — use cloudId to construct URL
    // The browse URL for Cloud is always https://**.atlassian.net/browse/KEY
    // but we don't have the site URL. Fall back to the issue self link pattern.
    return `https://api.atlassian.com/ex/jira/${auth.cloudId}/browse/${issueKey}`;
  }

  return `${auth.baseUrl}/browse/${issueKey}`;
}

// ─── Comments ───────────────────────────────────────────────────────────────

/**
 * Format a Jira comment into a single-line string: `[date] author: body`.
 */
function formatComment(comment: JiraComment): string {
  const date = comment.created.split("T")[0] ?? comment.created;
  const author = comment.author?.displayName ?? "System";
  const body =
    typeof comment.body === "string"
      ? comment.body
      : adfToMarkdown(comment.body);

  // Collapse multiline body into a single line for compact display
  const oneLine = body.replace(/\n+/g, " ").trim();
  return `[${date}] ${author}: ${oneLine}`;
}

/**
 * Extract and format the last N comments from a Jira issue.
 */
function extractComments(
  issue: JiraIssue,
  maxComments: number
): string[] | undefined {
  const commentData = issue.fields?.comment;
  if (!commentData?.comments?.length) return undefined;

  const comments = commentData.comments;
  const lastN = comments.slice(-maxComments);
  return lastN.map(formatComment);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Convert a Jira issue into Locus's internal LocusIssue format.
 *
 * Field mapping:
 * - id ← issue.key (e.g., "PROJ-123")
 * - title ← issue.fields.summary
 * - description ← ADF→Markdown or raw string
 * - labels ← issue.fields.labels
 * - priority ← Jira priority name → Locus label
 * - assignee ← config.userMapping lookup, fallback to displayName
 * - url ← {baseUrl}/browse/{key}
 * - comments ← last N comments formatted as "[date] author: body"
 */
export function mapJiraIssue(issue: JiraIssue, config: JiraConfig): LocusIssue {
  const maxComments = config.includeComments ? DEFAULT_COMMENT_COUNT : 0;

  const f = issue.fields;

  const result: LocusIssue = {
    id: issue.key,
    title: f?.summary ?? "(no summary)",
    description: convertDescription(f?.description),
    labels: [...(f?.labels ?? [])],
    priority: mapPriority(f?.priority?.name),
    url: buildIssueUrl(issue.key, config),
  };

  const assignee = resolveAssignee(f?.assignee, config.userMapping);
  if (assignee) {
    result.assignee = assignee;
  }

  if (maxComments > 0) {
    const comments = extractComments(issue, maxComments);
    if (comments) {
      result.comments = comments;
    }
  }

  return result;
}

/**
 * Convert a batch of Jira issues into LocusIssue format.
 */
export function mapJiraIssueBatch(
  issues: JiraIssue[],
  config: JiraConfig
): LocusIssue[] {
  return issues.map((issue) => mapJiraIssue(issue, config));
}
