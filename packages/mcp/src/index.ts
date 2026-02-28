#!/usr/bin/env node

/**
 * @locusai/mcp — MCP server for Locus.
 *
 * Exposes Locus capabilities as Claude Code tools, resources, and prompts,
 * allowing Locus to be used as a native Claude Code plugin instead of
 * running `claude --dangerously-skip-permissions`.
 *
 * Install in Claude Code:
 *   claude mcp add locus -- npx @locusai/mcp
 *
 * Or in .mcp.json:
 *   { "mcpServers": { "locus": { "type": "stdio", "command": "npx", "args": ["@locusai/mcp"] } } }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execLocus, getProjectRoot, readProjectFile } from "./helpers.js";

const server = new McpServer({
  name: "locus",
  version: "0.18.0",
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

// ─── Tools ──────────────────────────────────────────────────────────────────

server.tool(
  "locus_status",
  "Show the current Locus project status — active sprint, issue breakdown, running agents, and open PRs",
  {},
  async () => {
    const result = await execLocus(["status"]);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_plan",
  "AI-powered sprint planning: break a goal into actionable GitHub issues",
  {
    directive: z.string().describe("The goal or directive to plan (e.g. 'Build user authentication with OAuth')"),
    sprint: z.string().optional().describe("Sprint name to assign issues to"),
    dryRun: z.boolean().optional().describe("Preview the plan without creating issues"),
  },
  async ({ directive, sprint, dryRun }) => {
    const args = ["plan", directive];
    if (sprint) args.push("--sprint", sprint);
    if (dryRun) args.push("--dry-run");
    const result = await execLocus(args);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_plan_approve",
  "Approve a saved plan and create GitHub issues from it",
  {
    planId: z.string().describe("The plan ID to approve (from locus plan list)"),
    sprint: z.string().optional().describe("Sprint name to assign issues to"),
  },
  async ({ planId, sprint }) => {
    const args = ["plan", "approve", planId];
    if (sprint) args.push("--sprint", sprint);
    const result = await execLocus(args);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_plan_list",
  "List saved plans that can be approved",
  {},
  async () => {
    const result = await execLocus(["plan", "list"]);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_plan_show",
  "Show details of a saved plan",
  {
    planId: z.string().describe("The plan ID to show"),
  },
  async ({ planId }) => {
    const result = await execLocus(["plan", "show", planId]);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_run",
  "Execute sprint tasks or specific issues using AI agents. Without issue numbers, runs the active sprint sequentially. With issue numbers, runs them in parallel using worktrees.",
  {
    issues: z.array(z.number()).optional().describe("Issue numbers to run (empty = run active sprint)"),
    dryRun: z.boolean().optional().describe("Preview what would happen without executing"),
    model: z.string().optional().describe("Override AI model (e.g. 'opus', 'sonnet', 'haiku')"),
    resume: z.boolean().optional().describe("Resume a previously interrupted run"),
  },
  async ({ issues, dryRun, model, resume }) => {
    const args = ["run"];
    if (resume) args.push("--resume");
    if (issues && issues.length > 0) {
      args.push(...issues.map(String));
    }
    if (dryRun) args.push("--dry-run");
    if (model) args.push("--model", model);
    const result = await execLocus(args, { timeout: 600_000 });
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_review",
  "AI-powered code review on pull requests. Posts review comments on GitHub.",
  {
    prNumber: z.number().optional().describe("PR number to review (empty = all open agent:managed PRs)"),
    focus: z.string().optional().describe("Comma-separated focus areas (e.g. 'security,performance')"),
    dryRun: z.boolean().optional().describe("Preview the review without posting"),
  },
  async ({ prNumber, focus, dryRun }) => {
    const args = ["review"];
    if (prNumber) args.push(String(prNumber));
    if (focus) args.push("--focus", focus);
    if (dryRun) args.push("--dry-run");
    const result = await execLocus(args, { timeout: 300_000 });
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_iterate",
  "Re-execute tasks with PR feedback — closes the feedback loop: run → review → iterate → merge",
  {
    prNumber: z.number().optional().describe("Specific PR number to iterate on"),
    issueNumber: z.number().optional().describe("Find the PR for this issue and iterate"),
    sprint: z.boolean().optional().describe("Iterate on all active sprint PRs with feedback"),
    dryRun: z.boolean().optional().describe("Preview without executing"),
  },
  async ({ prNumber, issueNumber, sprint, dryRun }) => {
    const args = ["iterate"];
    if (prNumber) args.push("--pr", String(prNumber));
    else if (issueNumber) args.push(String(issueNumber));
    else if (sprint) args.push("--sprint");
    if (dryRun) args.push("--dry-run");
    const result = await execLocus(args, { timeout: 300_000 });
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_issue_create",
  "Create a new GitHub issue using AI to generate a well-structured issue from a description",
  {
    description: z.string().describe("Description of the task/feature/bug"),
    sprint: z.string().optional().describe("Sprint to assign the issue to"),
  },
  async ({ description, sprint }) => {
    const args = ["issue", "create", description];
    if (sprint) args.push("--sprint", sprint);
    // Pass --yes flag to skip interactive confirmation since we're non-interactive
    const result = await execLocus(args, { stdin: "y\n" });
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_issue_list",
  "List GitHub issues with filters",
  {
    sprint: z.string().optional().describe("Filter by sprint name"),
    priority: z.enum(["critical", "high", "medium", "low"]).optional().describe("Filter by priority"),
    status: z.enum(["queued", "in-progress", "in-review", "done", "failed"]).optional().describe("Filter by Locus status"),
    state: z.enum(["open", "closed", "all"]).optional().describe("GitHub issue state (default: open)"),
    limit: z.number().optional().describe("Max results (default: 50)"),
  },
  async ({ sprint, priority, status, state, limit }) => {
    const args = ["issue", "list"];
    if (sprint) args.push("--sprint", sprint);
    if (priority) args.push("--priority", priority);
    if (status) args.push("--status", status);
    if (state) args.push("--state", state);
    if (limit) args.push("--limit", String(limit));
    const result = await execLocus(args);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_issue_show",
  "Show detailed information about a specific GitHub issue",
  {
    issueNumber: z.number().describe("Issue number to show"),
  },
  async ({ issueNumber }) => {
    const result = await execLocus(["issue", "show", String(issueNumber)]);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_issue_close",
  "Close a GitHub issue",
  {
    issueNumber: z.number().describe("Issue number to close"),
    reason: z.enum(["completed", "not_planned"]).optional().describe("Close reason (default: completed)"),
  },
  async ({ issueNumber, reason }) => {
    const args = ["issue", "close", String(issueNumber)];
    if (reason) args.push("--reason", reason);
    const result = await execLocus(args);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_sprint_create",
  "Create a new sprint (GitHub milestone)",
  {
    name: z.string().describe("Sprint name"),
    description: z.string().optional().describe("Sprint description"),
    due: z.string().optional().describe("Due date (YYYY-MM-DD)"),
  },
  async ({ name, description, due }) => {
    const args = ["sprint", "create", name];
    if (description) args.push("--description", description);
    if (due) args.push("--due", due);
    const result = await execLocus(args);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_sprint_list",
  "List all sprints (open and closed)",
  {
    all: z.boolean().optional().describe("Show closed sprints too"),
  },
  async ({ all }) => {
    const args = ["sprint", "list"];
    if (all) args.push("--all");
    const result = await execLocus(args);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_sprint_show",
  "Show sprint details including issues, progress, and execution order",
  {
    name: z.string().describe("Sprint name to show"),
  },
  async ({ name }) => {
    const result = await execLocus(["sprint", "show", name]);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_sprint_active",
  "Set the active sprint",
  {
    name: z.string().describe("Sprint name to activate"),
  },
  async ({ name }) => {
    const result = await execLocus(["sprint", "active", name]);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_config_get",
  "View Locus configuration values",
  {
    key: z.string().optional().describe("Config key path (e.g. 'ai.model', 'agent.maxParallel'). Omit to show all."),
  },
  async ({ key }) => {
    const args = ["config"];
    if (key) args.push(key);
    const result = await execLocus(args);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_config_set",
  "Update a Locus configuration value",
  {
    key: z.string().describe("Config key path (e.g. 'ai.model', 'agent.maxParallel')"),
    value: z.string().describe("New value to set"),
  },
  async ({ key, value }) => {
    const result = await execLocus(["config", key, value]);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

server.tool(
  "locus_init",
  "Initialize Locus in a repository — creates .locus/ directory, GitHub labels, and configuration",
  {},
  async () => {
    const result = await execLocus(["init", "--yes"]);
    return {
      content: [{ type: "text", text: result.output }],
      isError: !result.success,
    };
  }
);

// ─── Resources ──────────────────────────────────────────────────────────────

server.resource(
  "project-instructions",
  "locus://instructions",
  {
    description: "Project instructions from LOCUS.md — conventions, architecture, and patterns the AI should follow",
    mimeType: "text/markdown",
  },
  async () => {
    const root = getProjectRoot();
    const content = readProjectFile(root, "LOCUS.md") ??
      readProjectFile(root, ".locus/LOCUS.md") ??
      "No LOCUS.md found. Run `locus init` to create one.";
    return {
      contents: [{ uri: "locus://instructions", text: content, mimeType: "text/markdown" }],
    };
  }
);

server.resource(
  "project-learnings",
  "locus://learnings",
  {
    description: "Accumulated learnings from past AI agent executions — mistakes to avoid and patterns to follow",
    mimeType: "text/markdown",
  },
  async () => {
    const root = getProjectRoot();
    const content = readProjectFile(root, ".locus/LEARNINGS.md") ??
      "No learnings recorded yet. Learnings accumulate as AI agents complete tasks.";
    return {
      contents: [{ uri: "locus://learnings", text: content, mimeType: "text/markdown" }],
    };
  }
);

server.resource(
  "project-config",
  "locus://config",
  {
    description: "Current Locus project configuration (AI provider, sprint settings, agent config)",
    mimeType: "application/json",
  },
  async () => {
    const root = getProjectRoot();
    const content = readProjectFile(root, ".locus/config.json") ??
      '{"error": "No .locus/config.json found. Run `locus init` to initialize."}';
    return {
      contents: [{ uri: "locus://config", text: content, mimeType: "application/json" }],
    };
  }
);

// ─── Prompts (become slash commands: /mcp__locus__<name>) ───────────────────

server.prompt(
  "plan-sprint",
  "Plan a sprint: break a goal into actionable GitHub issues",
  {
    goal: z.string().describe("The goal or directive to plan"),
    sprint: z.string().optional().describe("Sprint name to assign issues to"),
  },
  async ({ goal, sprint }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the locus_plan tool to plan a sprint for the following goal:\n\nGoal: ${goal}${sprint ? `\nSprint: ${sprint}` : ""}\n\nAfter the plan is created, show me the results and ask if I'd like to approve it.`,
        },
      },
    ],
  })
);

server.prompt(
  "run-sprint",
  "Execute the active sprint or specific issues",
  {
    issues: z.string().optional().describe("Comma-separated issue numbers (empty = active sprint)"),
  },
  async ({ issues }) => {
    const issueList = issues ? issues.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: issueList.length > 0
              ? `Use the locus_run tool to execute issues: ${issueList.join(", ")}. Show me the progress and results.`
              : "Use the locus_run tool to execute the active sprint. First show me the current status with locus_status, then proceed with the run.",
          },
        },
      ],
    };
  }
);

server.prompt(
  "review-prs",
  "AI-powered code review on open PRs",
  {
    pr_number: z.string().optional().describe("Specific PR number to review (empty = all agent PRs)"),
    focus: z.string().optional().describe("Focus areas like 'security,performance'"),
  },
  async ({ pr_number, focus }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: pr_number
            ? `Use the locus_review tool to review PR #${pr_number}${focus ? ` with focus on: ${focus}` : ""}. Show me the review results.`
            : `Use the locus_review tool to review all open agent-managed PRs${focus ? ` with focus on: ${focus}` : ""}. Show me the review results.`,
        },
      },
    ],
  })
);

server.prompt(
  "project-overview",
  "Get a comprehensive overview of the Locus project state",
  async () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Give me a comprehensive overview of this Locus project. Use the following tools:\n1. locus_status — to see the project dashboard\n2. Read the locus://instructions resource — to understand project conventions\n3. Read the locus://config resource — to see the configuration\n4. locus_issue_list — to see open issues\n5. locus_sprint_list — to see sprints\n\nSummarize everything in a clear, organized format.",
        },
      },
    ],
  })
);

// ─── Start Server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr (never stdout — that's the JSON-RPC channel)
  console.error("Locus MCP server started");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
