/**
 * AI middleware for issue creation.
 *
 * Uses `invokeLocus` to analyze the codebase and generate a detailed
 * Linear issue with description, priority, labels, and acceptance criteria.
 */

import { invokeLocus } from "@locusai/sdk";

export interface AiIssueResult {
  description: string;
  priority: number;
  labels: string[];
  acceptanceCriteria: string[];
}

const DEFAULT_RESULT: AiIssueResult = {
  description: "",
  priority: 3,
  labels: [],
  acceptanceCriteria: [],
};

/**
 * Invoke AI to enrich a brief issue title into a fully detailed issue.
 * Returns structured fields to be used when creating the Linear issue.
 */
export async function aiEnrichIssue(title: string): Promise<AiIssueResult> {
  const prompt = buildPrompt(title);
  const result = await invokeLocus(["exec", prompt]);

  if (result.exitCode !== 0) {
    return DEFAULT_RESULT;
  }

  const parsed = extractJson(result.stdout);
  if (!parsed) {
    return DEFAULT_RESULT;
  }

  return parsed;
}

function buildPrompt(title: string): string {
  return [
    "You are a senior software engineer helping create a well-structured issue.",
    "Given the following issue title, analyze the current codebase and generate a detailed issue specification.",
    "",
    "Output ONLY a valid JSON object with these exact fields:",
    "",
    "  description: A detailed markdown description of the issue including:",
    "    - What needs to be done and why",
    "    - Relevant files or modules that may need changes",
    "    - Implementation hints based on the codebase",
    "  priority: A number 1-4 where 1=urgent, 2=high, 3=medium, 4=low",
    '  labels: An array of suggested label strings (e.g., ["bug", "frontend", "api"])',
    "  acceptanceCriteria: An array of specific, testable acceptance criteria strings",
    "",
    "Rules:",
    "- Output ONLY the JSON object, no markdown fences, no explanation.",
    "- The description should be thorough but concise (2-4 paragraphs).",
    "- Priority should reflect the likely impact and urgency.",
    "- Labels should be relevant to the codebase and the task.",
    "- Acceptance criteria should be specific and verifiable.",
    "- Keep the total response under 1000 tokens.",
    "",
    `Issue title: "${title}"`,
  ].join("\n");
}

function extractJson(output: string): AiIssueResult | null {
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const description =
      typeof parsed.description === "string" ? parsed.description : "";
    const priority =
      typeof parsed.priority === "number" &&
      parsed.priority >= 1 &&
      parsed.priority <= 4
        ? parsed.priority
        : 3;
    const labels = Array.isArray(parsed.labels)
      ? (parsed.labels.filter((l) => typeof l === "string") as string[])
      : [];
    const acceptanceCriteria = Array.isArray(parsed.acceptanceCriteria)
      ? (parsed.acceptanceCriteria.filter(
          (c) => typeof c === "string"
        ) as string[])
      : [];

    return { description, priority, labels, acceptanceCriteria };
  } catch {
    return null;
  }
}
