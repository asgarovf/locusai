export { handleCommandError, handleJiraError } from "./errors.js";
export {
  JiraAuthError,
  JiraTokenExpiredError,
  JiraPermissionError,
  JiraNotFoundError,
  JiraRateLimitError,
} from "./errors.js";
export {
  loadJiraConfig,
  saveJiraConfig,
  validateJiraConfig,
  saveCredentials,
  clearCredentials,
  loadCredentials,
} from "./config.js";
export type {
  JiraConfig,
  JiraCredentials,
  JiraOAuthCredentials,
  JiraApiTokenCredentials,
  JiraPatCredentials,
  JiraAuthMethod,
} from "./types.js";
export type {
  JiraIssue,
  JiraIssueFields,
  JiraSearchResult,
  JiraTransition,
  JiraSprint,
  JiraBoard,
  JiraProject,
  JiraUser,
  JiraComment,
  ADFNode,
  ADFMark,
} from "./client/types.js";

export async function main(args: string[]): Promise<void> {
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  console.error(`Unknown command: ${command}\nRun "locus jira help" for usage.`);
  process.exit(1);
}

function printHelp(): void {
  console.log(`
locus-jira — Fetch and execute Jira issues with Locus

Usage:
  locus jira <command> [options]

Commands:
  auth          Authenticate with Jira (OAuth 2.0)
  help          Show this help message

Options:
  -h, --help    Show help
`.trim());
}
