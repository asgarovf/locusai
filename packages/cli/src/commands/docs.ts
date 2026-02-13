import { parseArgs } from "node:util";
import { c, DocumentFetcher, LocusClient } from "@locusai/sdk/node";
import { ConfigManager } from "../config-manager";
import { SettingsManager } from "../settings-manager";
import { requireInitialization, VERSION } from "../utils";
import { WorkspaceResolver } from "../workspace-resolver";

export async function docsCommand(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "sync":
      await docsSyncCommand(subArgs);
      break;
    default:
      showDocsHelp();
      break;
  }
}

async function docsSyncCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      "api-url": { type: "string" },
      workspace: { type: "string" },
      dir: { type: "string" },
      help: { type: "boolean" },
    },
    strict: false,
  });

  if (values.help) {
    showDocsSyncHelp();
    return;
  }

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "docs sync");

  const configManager = new ConfigManager(projectPath);
  configManager.updateVersion(VERSION);

  const settingsManager = new SettingsManager(projectPath);
  const settings = settingsManager.load();

  const apiKey = (values["api-key"] as string) || settings.apiKey;
  if (!apiKey) {
    console.error(
      `\n  ${c.error("✖")} ${c.red("API key is required")}\n` +
        `  ${c.dim(
          "Configure with: locus config setup --api-key <key>\n  Or pass --api-key flag"
        )}\n`
    );
    process.exit(1);
  }

  const apiBase =
    (values["api-url"] as string) ||
    settings.apiUrl ||
    "https://api.locusai.dev/api";

  const resolver = new WorkspaceResolver({
    apiKey,
    apiBase,
    workspaceId: values.workspace as string | undefined,
  });

  let workspaceId: string;
  try {
    workspaceId = await resolver.resolve();
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        error instanceof Error ? error.message : String(error)
      )}\n`
    );
    process.exit(1);
  }

  const client = new LocusClient({
    baseUrl: apiBase,
    token: apiKey,
  });

  const fetcher = new DocumentFetcher({
    client,
    workspaceId,
    projectPath,
    log: (message, level) => {
      if (level === "error") {
        console.log(`  ${c.error("✖")} ${message}`);
        return;
      }
      if (level === "warn") {
        console.log(`  ${c.warning("!")} ${message}`);
        return;
      }
      if (level === "success") {
        console.log(`  ${c.success("✔")} ${message}`);
        return;
      }
      console.log(`  ${c.info("●")} ${message}`);
    },
  });

  console.log(`\n  ${c.info("●")} ${c.bold("Syncing docs from API...")}\n`);

  try {
    await fetcher.fetch();
    console.log(
      `\n  ${c.success("✔")} ${c.success("Docs sync complete.")} ${c.dim("Local docs: .locus/documents")}\n`
    );
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.red(
        `Docs sync failed: ${error instanceof Error ? error.message : String(error)}`
      )}\n`
    );
    process.exit(1);
  }
}

function showDocsHelp(): void {
  console.log(`
  ${c.header(" DOCS ")}
    ${c.primary("locus docs")} ${c.dim("<command> [options]")}

  ${c.header(" COMMANDS ")}
    ${c.success("sync")}      Sync workspace docs from API to .locus/documents

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus docs sync")}
    ${c.dim("$")} ${c.primary("locus docs sync --workspace ws_123")}
`);
}

function showDocsSyncHelp(): void {
  console.log(`
  ${c.header(" DOCS SYNC ")}
    ${c.primary("locus docs sync")} ${c.dim("[options]")}

  ${c.header(" OPTIONS ")}
    ${c.secondary("--api-key")} <key>     API key override (reads from settings.json)
    ${c.secondary("--api-url")} <url>     API base URL (default: https://api.locusai.dev/api)
    ${c.secondary("--workspace")} <id>    Workspace ID (optional if persisted or resolvable)
    ${c.secondary("--dir")} <path>        Project directory (default: current)
    ${c.secondary("--help")}              Show docs sync help

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus docs sync")}
    ${c.dim("$")} ${c.primary("locus docs sync --workspace ws_123")}
`);
}
