/**
 * Field mapper for Linear ↔ GitHub translations.
 *
 * Translates priorities, workflow states, labels, and assignees
 * between Linear and GitHub (Locus) conventions.
 */

import type { LinearIssue } from "../types.js";

// ─── Priority Mapping ────────────────────────────────────────────────────────

const PRIORITY_MAP: Record<number, string> = {
  0: "p:none",
  1: "p:critical",
  2: "p:high",
  3: "p:medium",
  4: "p:low",
};

const REVERSE_PRIORITY_MAP: Record<string, number> = {
  "p:critical": 1,
  "p:high": 2,
  "p:medium": 3,
  "p:low": 4,
  "p:none": 0,
};

/**
 * Map a Linear priority number (0-4) to a GitHub label string.
 * 0 = no priority, 1 = urgent/critical, 2 = high, 3 = medium, 4 = low.
 */
export function mapPriority(linearPriority: number): string {
  return PRIORITY_MAP[linearPriority] ?? "p:none";
}

/**
 * Reverse-map a priority label back to a Linear priority number.
 */
export function reverseMapPriority(label: string): number | null {
  return REVERSE_PRIORITY_MAP[label] ?? null;
}

// ─── State Mapping ───────────────────────────────────────────────────────────

/**
 * Map a Linear workflow state name to a GitHub label using the configured mapping.
 *
 * @param linearState - The Linear workflow state name (e.g., "In Progress")
 * @param stateMapping - Config mapping from Linear state → GitHub label
 * @returns The mapped GitHub label, or the original state name kebab-cased as fallback
 */
export function mapState(
  linearState: string,
  stateMapping: Record<string, string>
): string {
  if (stateMapping[linearState]) {
    return stateMapping[linearState];
  }
  return linearState.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Reverse-map GitHub labels back to a Linear workflow state name.
 * Scans the labels array and returns the first match found in the reverse mapping.
 *
 * @param githubLabels - Array of GitHub label strings
 * @param stateMapping - Config mapping from Linear state → GitHub label
 * @returns The Linear state name, or null if no match
 */
export function reverseMapState(
  githubLabels: string[],
  stateMapping: Record<string, string>
): string | null {
  const reverseMap: Record<string, string> = {};
  for (const [linearState, githubLabel] of Object.entries(stateMapping)) {
    reverseMap[githubLabel] = linearState;
  }

  for (const label of githubLabels) {
    if (reverseMap[label]) {
      return reverseMap[label];
    }
  }
  return null;
}

// ─── Label Mapping ───────────────────────────────────────────────────────────

/**
 * Map Linear label names to GitHub label names using the configured mapping.
 *
 * @param linearLabels - Array of Linear label names
 * @param labelMapping - Config mapping from Linear label → GitHub label
 * @returns Array of mapped GitHub label strings
 */
export function mapLabels(
  linearLabels: string[],
  labelMapping: Record<string, string>
): string[] {
  return linearLabels.map((label) => {
    if (labelMapping[label]) {
      return labelMapping[label];
    }
    return label.toLowerCase().replace(/\s+/g, "-");
  });
}

// ─── Assignee Mapping ────────────────────────────────────────────────────────

/**
 * Map a Linear user ID to a GitHub username using the configured mapping.
 *
 * @param linearUserId - The Linear user ID
 * @param userMapping - Config mapping from Linear user ID → GitHub username
 * @returns GitHub username, or null if no mapping exists
 */
export function mapAssignee(
  linearUserId: string,
  userMapping: Record<string, string>
): string | null {
  return userMapping[linearUserId] ?? null;
}

// ─── GitHub Issue Payload ────────────────────────────────────────────────────

export interface GitHubIssuePayload {
  title: string;
  body: string;
  labels: string[];
  assignee: string | null;
}

/**
 * Build a complete GitHub Issue payload from a Linear issue.
 *
 * Combines priority, state, and label mappings into a single labels array,
 * and formats the body with a link back to Linear.
 */
export function buildGitHubIssuePayload(
  issue: LinearIssue,
  options: {
    stateMapping: Record<string, string>;
    labelMapping: Record<string, string>;
    userMapping: Record<string, string>;
  }
): GitHubIssuePayload {
  const labels: string[] = [];

  // Priority label
  const priorityLabel = mapPriority(issue.priority);
  if (priorityLabel !== "p:none") {
    labels.push(priorityLabel);
  }

  // State label
  const stateLabel = mapState(issue.state, options.stateMapping);
  labels.push(stateLabel);

  // Issue labels
  const mappedLabels = mapLabels(issue.labels, options.labelMapping);
  labels.push(...mappedLabels);

  // Assignee
  const assignee = issue.assigneeId
    ? mapAssignee(issue.assigneeId, options.userMapping)
    : null;

  // Body with Linear link
  const bodyParts: string[] = [];

  if (issue.description) {
    bodyParts.push(issue.description);
  }

  bodyParts.push(`---\n_Synced from Linear: [${issue.identifier}](${issue.url})_`);

  return {
    title: `${issue.identifier}: ${issue.title}`,
    body: bodyParts.join("\n\n"),
    labels,
    assignee,
  };
}
