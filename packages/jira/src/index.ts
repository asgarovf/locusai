export { promptForApiToken } from "./auth/api-token.js";
export { promptForPAT } from "./auth/pat.js";
export { adfToMarkdown } from "./client/adf-to-md.js";
export { JiraClient } from "./client/client.js";
export type {
  ADFMark,
  ADFNode,
  JiraBoard,
  JiraComment,
  JiraIssue,
  JiraIssueFields,
  JiraProject,
  JiraSearchResult,
  JiraSprint,
  JiraTransition,
  JiraUser,
} from "./client/types.js";
export {
  clearCredentials,
  loadCredentials,
  loadJiraConfig,
  saveCredentials,
  saveJiraConfig,
  validateJiraConfig,
} from "./config.js";
export {
  handleCommandError,
  handleJiraError,
  JiraAuthError,
  JiraNotFoundError,
  JiraPermissionError,
  JiraRateLimitError,
  JiraTokenExpiredError,
} from "./errors.js";
export type { LocusIssue } from "./mapper.js";
export { mapJiraIssue, mapJiraIssueBatch } from "./mapper.js";
export type {
  JiraApiTokenCredentials,
  JiraAuthMethod,
  JiraConfig,
  JiraCredentials,
  JiraOAuthCredentials,
  JiraPatCredentials,
  TransitionOnPR,
} from "./types.js";

export async function main(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  try {
    switch (command) {
      case "auth": {
        const { authCommand } = await import("./commands/auth.js");
        return await authCommand(args.slice(1));
      }
      case "project": {
        const { projectCommand } = await import("./commands/project.js");
        return await projectCommand(args.slice(1));
      }
      case "board": {
        const { boardCommand } = await import("./commands/board.js");
        return await boardCommand(args.slice(1));
      }
      case "issues": {
        const { issuesCommand } = await import("./commands/issues.js");
        return await issuesCommand(args.slice(1));
      }
      case "issue": {
        const { issueCommand } = await import("./commands/issue.js");
        return await issueCommand(args.slice(1));
      }
      case "run": {
        const { runCommand } = await import("./commands/run.js");
        return await runCommand(args.slice(1));
      }
      case "sprint": {
        const { sprintCommand } = await import("./commands/sprint.js");
        return await sprintCommand(args.slice(1));
      }
      case "sync": {
        const { syncCommand } = await import("./commands/sync.js");
        return await syncCommand(args.slice(1));
      }
      case "help":
      case "--help":
      case "-h":
        printHelp();
        return;
      default:
        console.error(
          `Unknown command: ${command}\nRun "locus jira help" for usage.`
        );
        process.exit(1);
    }
  } catch (err) {
    const { handleCommandError } = await import("./errors.js");
    handleCommandError(err);
  }
}

function printHelp(): void {
  console.log(
    `
locus-jira — Fetch and execute Jira issues with Locus

Usage:
  locus jira <command> [options]

Commands:
  auth          Authenticate with Jira (API Token or PAT)
  project       Select active Jira project
  board         Select active Jira board
  issues        List issues (tabular view)
  issue         Show detailed view of a single issue
  run           Fetch and execute Jira issues via Locus
  sprint        Run active sprint issues (shorthand for run --sprint)
  sync          Sync execution results back to Jira
  help          Show this help message

Auth Options:
  --status      Show current authentication status
  --revoke      Clear stored credentials
  --method      Skip interactive selection (api-token or pat)

Issues Options:
  --jql <query> Custom JQL filter
  --sprint      Show issues from active sprint
  --limit <n>   Limit results (default: 25)

Run Options:
  --jql <query> Fetch issues by JQL query
  --sprint      Fetch issues from active sprint
  --status <s>  Filter by Jira status (e.g., "To Do")
  --dry-run     Show issues without executing
  --sync        Sync status back to Jira after execution

Sprint Options:
  --status <s>  Filter sprint issues by status (default: "To Do")
  --info        Show sprint details without running
  --dry-run     Preview without executing
  --sync        Sync status back to Jira after execution

Sync Options:
  --jql <query> Sync issues matching JQL query
  --sprint      Sync active sprint issues
  --comments    Post execution summary as Jira comment
  --dry-run     Show planned changes without executing

Options:
  -h, --help    Show help
`.trim()
  );
}
