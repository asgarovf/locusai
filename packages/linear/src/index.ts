/**
 * Main entry point for locus-linear.
 *
 * Dispatches subcommands for Linear integration:
 *   - auth: OAuth setup and token management
 *   - import: Linear → GitHub issue import
 *   - export: GitHub → Linear status export
 *   - sync: Bidirectional sync (import + export)
 *   - create: AI-assisted issue creation in Linear
 *   - issues: List Linear issues
 *   - issue: Show single issue details
 *   - team: Team selection
 *   - mapping: Show/edit state & label mappings
 *
 * Usage:
 *   locus pkg linear auth          → Complete OAuth flow
 *   locus pkg linear import        → Import Linear issues to GitHub
 *   locus pkg linear issues        → List issues from configured team
 */

import type { LinearCommand } from "./types.js";

export { LocusLinearClient } from "./client.js";
export type { LocusLinearClientOptions } from "./client.js";
export {
  loadLinearConfig,
  validateLinearConfig,
  saveLinearConfig,
  saveTokens,
  clearTokens,
  setTeamKey,
  loadTokens,
} from "./config.js";
export {
  isTokenExpired,
  refreshAccessToken,
  revokeToken,
} from "./auth/token.js";

export async function main(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  switch (command) {
    case "auth":
      return handleStub("auth", args.slice(1));
    case "import":
      return handleStub("import", args.slice(1));
    case "export":
      return handleStub("export", args.slice(1));
    case "sync":
      return handleStub("sync", args.slice(1));
    case "create":
      return handleStub("create", args.slice(1));
    case "issues":
      return handleStub("issues", args.slice(1));
    case "issue":
      return handleStub("issue", args.slice(1));
    case "team":
      return handleStub("team", args.slice(1));
    case "mapping":
      return handleStub("mapping", args.slice(1));
    case "help":
    case "--help":
    case "-h":
      return printHelp();
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function handleStub(command: string, _args: string[]): void {
  console.log(
    `\n  Command "${command}" is not yet implemented.\n  This is a placeholder — implementation coming in a future sprint.\n`
  );
}

function printHelp(): void {
  console.log(`
  locus-linear — Linear integration for Locus

  Usage:
    locus pkg linear <command>

  Authentication:
    auth                          Complete OAuth flow (opens browser)
    auth --status                 Show current auth status
    auth --revoke                 Revoke OAuth token

  Team:
    team                          Show current team
    team <KEY>                    Set active team (e.g., ENG)

  Sync:
    import                        Import Linear issues → GitHub Issues
    import --cycle                Import only from active cycle
    import --enrich               AI-enrich issues during import
    export                        Export Locus status updates → Linear
    sync                          Bidirectional: import + export

  AI-Powered:
    create "<title>"              AI-assisted issue creation in Linear

  Query:
    issues                        List issues from configured team
    issues --cycle                List issues in active cycle
    issue <ID>                    Show single issue details (e.g., ENG-123)

  Mapping:
    mapping                       Show state & label mappings

  Examples:
    locus pkg linear auth
    locus pkg linear import --enrich
    locus pkg linear create "Add rate limiting to the API"
    locus pkg linear issues --cycle
    locus pkg linear issue ENG-123
  `);
}

export type {
  ImportFilter,
  IssueMapping,
  LinearCommand,
  LinearConfig,
  LinearCycle,
  LinearIssue,
  LinearLabel,
  LinearTeam,
  LinearWorkflowState,
  SyncState,
  TokenInfo,
} from "./types.js";
