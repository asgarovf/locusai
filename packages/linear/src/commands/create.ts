/**
 * AI-assisted issue creation command for locus-linear.
 *
 * Creates a new Linear issue, optionally enriched by AI analysis
 * of the codebase for detailed description, priority, and labels.
 *
 * Usage:
 *   locus pkg linear create "Add rate limiting"         → AI-enriched issue
 *   locus pkg linear create "Fix login bug" --no-ai     → plain issue (title only)
 */

import type { IssuePayload } from "@linear/sdk";
import { aiEnrichIssue } from "../ai/create.js";
import { LocusLinearClient } from "../client.js";
import { loadLinearConfig, validateLinearConfig } from "../config.js";

interface CreateOptions {
  title: string;
  noAi: boolean;
}

export async function createCommand(args: string[]): Promise<void> {
  const options = parseCreateArgs(args);

  const config = loadLinearConfig();
  const configError = validateLinearConfig(config);
  if (configError) {
    process.stderr.write(`\n  ${configError}\n\n`);
    process.exit(1);
  }

  const client = LocusLinearClient.fromConfig();

  // Resolve team ID from team key
  const teams = await client.getTeams({
    first: 50,
    filter: { key: { eq: config.teamKey } },
  });
  const team = teams.nodes[0];
  if (!team) {
    process.stderr.write(
      `\n  Team "${config.teamKey}" not found. Run: locus pkg linear team <KEY>\n\n`
    );
    process.exit(1);
  }

  let description = "";
  let priority: number | undefined;
  let labelIds: string[] | undefined;

  if (!options.noAi) {
    process.stderr.write(
      "\n  Analyzing codebase and generating issue details...\n"
    );

    const aiResult = await aiEnrichIssue(options.title);

    if (aiResult.description) {
      // Build the full description with acceptance criteria
      const parts = [aiResult.description];
      if (aiResult.acceptanceCriteria.length > 0) {
        parts.push(
          "",
          "## Acceptance Criteria",
          "",
          ...aiResult.acceptanceCriteria.map((c) => `- [ ] ${c}`)
        );
      }
      description = parts.join("\n");
      priority = aiResult.priority;

      // Resolve label IDs from AI-suggested label names
      if (aiResult.labels.length > 0) {
        const allLabels = await client.getLabels({ first: 100 });
        const resolved: string[] = [];
        for (const suggested of aiResult.labels) {
          const match = allLabels.nodes.find(
            (l) => l.name.toLowerCase() === suggested.toLowerCase()
          );
          if (match) {
            resolved.push(match.id);
          }
        }
        if (resolved.length > 0) {
          labelIds = resolved;
        }
      }

      process.stderr.write("  AI enrichment complete.\n");
    } else {
      process.stderr.write("  AI enrichment failed — creating plain issue.\n");
    }
  }

  // Create the issue
  const input: Record<string, unknown> = {
    teamId: team.id,
    title: options.title,
  };

  if (description) {
    input.description = description;
  }
  if (priority !== undefined) {
    input.priority = priority;
  }
  if (labelIds && labelIds.length > 0) {
    input.labelIds = labelIds;
  }

  let issuePayload: IssuePayload;
  try {
    issuePayload = await client.createIssue(
      input as Parameters<typeof client.createIssue>[0]
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n  Failed to create issue: ${msg}\n\n`);
    process.exit(1);
  }

  const issue = await issuePayload.issue;
  if (!issue) {
    process.stderr.write("\n  Issue created but could not fetch details.\n\n");
    return;
  }

  // Display result
  process.stderr.write("\n");
  process.stderr.write(`  Created: ${issue.identifier}: ${issue.title}\n`);
  process.stderr.write(`  URL:     ${issue.url}\n`);

  if (priority !== undefined) {
    const priorityNames = ["None", "Urgent", "High", "Medium", "Low"];
    process.stderr.write(
      `  Priority: ${priorityNames[priority] ?? priority}\n`
    );
  }

  process.stderr.write("\n");
}

function parseCreateArgs(args: string[]): CreateOptions {
  let title = "";
  let noAi = false;

  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--no-ai":
        noAi = true;
        break;
      default:
        if (arg.startsWith("--")) {
          process.stderr.write(`  Unknown flag: ${arg}\n`);
          process.exit(1);
        }
        positional.push(arg);
    }
  }

  title = positional.join(" ");

  if (!title) {
    process.stderr.write(
      '\n  Usage: locus pkg linear create "<title>"\n' +
        '  Example: locus pkg linear create "Add rate limiting to the API"\n\n'
    );
    process.exit(1);
  }

  return { title, noAi };
}
