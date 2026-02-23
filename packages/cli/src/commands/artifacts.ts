import { parseArgs } from "node:util";
import {
  type ArtifactInfo,
  findArtifact,
  formatDate,
  formatSize,
  listArtifacts,
  readArtifact,
} from "@locusai/commands";
import { c } from "@locusai/sdk/node";
import { requireInitialization } from "../utils";

/**
 * Artifacts command for the Locus CLI.
 *
 * Usage:
 *   locus artifacts              List all artifacts (sorted by creation time)
 *   locus artifacts show <name>  Show artifact content
 *   locus artifacts plan <name>  Convert artifact to a plan
 */
export async function artifactsCommand(args: string[]): Promise<void> {
  const { positionals } = parseArgs({
    args,
    options: {
      dir: { type: "string" },
    },
    strict: false,
    allowPositionals: true,
  });

  const projectPath = process.cwd();
  requireInitialization(projectPath, "artifacts");

  const subcommand = positionals[0];

  switch (subcommand) {
    case "show":
    case "view": {
      const name = positionals.slice(1).join(" ");
      if (!name) {
        console.error(`\n  ${c.error("Error:")} Artifact name is required\n`);
        console.log(`  ${c.dim("Usage: locus artifacts show <name>")}\n`);
        return;
      }
      await showArtifact(projectPath, name);
      break;
    }
    case "plan": {
      const name = positionals.slice(1).join(" ");
      if (!name) {
        console.error(`\n  ${c.error("Error:")} Artifact name is required\n`);
        console.log(`  ${c.dim("Usage: locus artifacts plan <name>")}\n`);
        return;
      }
      await convertToPlan(projectPath, name);
      break;
    }
    default:
      await listArtifactsCommand(projectPath);
      break;
  }
}

/**
 * List all artifacts sorted by creation time.
 */
async function listArtifactsCommand(projectPath: string): Promise<void> {
  const artifacts = listArtifacts(projectPath);

  if (artifacts.length === 0) {
    console.log(`\n  ${c.dim("No artifacts found.")}\n`);
    return;
  }

  console.log(
    `\n  ${c.primary("Artifacts")} ${c.dim(`(${artifacts.length} total)`)}\n`
  );

  for (let i = 0; i < artifacts.length; i++) {
    const artifact = artifacts[i];
    const index = c.dim(`${String(i + 1).padStart(2)}.`);
    const date = formatDate(artifact.createdAt);
    const size = formatSize(artifact.size);

    console.log(`  ${index} ${c.cyan(artifact.name)}`);
    console.log(`      ${c.dim(`${date} • ${size}`)}`);
  }

  console.log(
    `\n  ${c.dim("Use")} ${c.primary("locus artifacts show <name>")} ${c.dim("to view content")}`
  );
  console.log(
    `  ${c.dim("Use")} ${c.primary("locus artifacts plan <name>")} ${c.dim("to convert to a plan")}\n`
  );
}

/**
 * Show the content of a specific artifact.
 */
async function showArtifact(projectPath: string, name: string): Promise<void> {
  const result = findArtifact(projectPath, name);

  if (!result) {
    console.error(`\n  ${c.error("Error:")} Artifact "${name}" not found\n`);
    console.log(
      `  ${c.dim("Use 'locus artifacts' to see available artifacts")}\n`
    );
    return;
  }

  if (!result.match) {
    console.error(
      `\n  ${c.error("Error:")} Multiple artifacts match "${name}":\n`
    );
    for (const m of result.ambiguous) {
      console.log(`    ${c.cyan(m.name)}`);
    }
    console.log();
    return;
  }

  printArtifact(result.info, result.content);
}

/**
 * Print artifact content to the terminal.
 */
function printArtifact(info: ArtifactInfo, content: string): void {
  const date = formatDate(info.createdAt);
  const size = formatSize(info.size);

  console.log(`\n  ${c.primary(info.name)}`);
  console.log(`  ${c.dim(`${date} • ${size}`)}`);
  console.log(c.dim("  ─".repeat(30)));
  console.log();
  console.log(content);
}

/**
 * Convert an artifact to a plan by executing a prompt.
 */
async function convertToPlan(projectPath: string, name: string): Promise<void> {
  const result = findArtifact(projectPath, name);

  if (!result) {
    console.error(`\n  ${c.error("Error:")} Artifact "${name}" not found\n`);
    console.log(
      `  ${c.dim("Use 'locus artifacts' to see available artifacts")}\n`
    );
    return;
  }

  if (!result.match) {
    console.error(`\n  ${c.error("Error:")} Artifact "${name}" not found\n`);
    console.log(
      `  ${c.dim("Use 'locus artifacts' to see available artifacts")}\n`
    );
    return;
  }

  await runPlanConversion(result.info.name);
}

/**
 * Execute the plan conversion via the plan command.
 */
async function runPlanConversion(artifactName: string): Promise<void> {
  const { planCommand } = await import("./plan");

  console.log(
    `\n  ${c.primary("Converting artifact to plan:")} ${c.cyan(artifactName)}\n`
  );

  const directive = `Prepare a plan according to the artifact: ${artifactName}`;
  await planCommand([directive]);
}

/**
 * Show help for artifacts commands.
 */
export function showArtifactsHelp(): void {
  console.log(`
  ${c.primary("Artifact Commands")}

  ${c.success("list")}                 List all artifacts (default)
  ${c.success("show")} ${c.dim("<name>")}           Show artifact content
  ${c.success("plan")} ${c.dim("<name>")}           Convert artifact to a plan

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} locus artifacts
    ${c.dim("$")} locus artifacts show reduce-cli-terminal-output
    ${c.dim("$")} locus artifacts plan api-auth-refactor-prd

  ${c.dim("Artifact names can be partial matches.")}
`);
}

// Re-export utilities for backward compatibility
export { listArtifacts, readArtifact, formatSize, formatDate };
export type { ArtifactInfo };
