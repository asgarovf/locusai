export { promptForApiToken } from "./auth/api-token.js";
export { promptForPAT } from "./auth/pat.js";
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
export type {
  JiraApiTokenCredentials,
  JiraAuthMethod,
  JiraConfig,
  JiraCredentials,
  JiraOAuthCredentials,
  JiraPatCredentials,
} from "./types.js";

export async function main(args: string[]): Promise<void> {
  const command = args[0];

  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    printHelp();
    return;
  }

  if (command === "auth") {
    const { authCommand } = await import("./commands/auth.js");
    return authCommand(args.slice(1));
  }

  console.error(
    `Unknown command: ${command}\nRun "locus jira help" for usage.`
  );
  process.exit(1);
}

function printHelp(): void {
  console.log(
    `
locus-jira — Fetch and execute Jira issues with Locus

Usage:
  locus jira <command> [options]

Commands:
  auth          Authenticate with Jira (API Token or PAT)
  help          Show this help message

Auth Options:
  --status      Show current authentication status
  --revoke      Clear stored credentials

Options:
  -h, --help    Show help
`.trim()
  );
}
