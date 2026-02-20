import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { c, getLocusPath } from "@locusai/sdk/node";
import { requireInitialization } from "../utils";

interface ArtifactInfo {
  name: string;
  fileName: string;
  createdAt: Date;
  size: number;
}

/**
 * List artifacts sorted by creation time (newest first).
 */
function listArtifacts(projectPath: string): ArtifactInfo[] {
  const artifactsDir = getLocusPath(projectPath, "artifactsDir");

  if (!existsSync(artifactsDir)) {
    return [];
  }

  const files = readdirSync(artifactsDir).filter((f) => f.endsWith(".md"));

  return files
    .map((fileName) => {
      const filePath = join(artifactsDir, fileName);
      const stat = statSync(filePath);
      const name = fileName.replace(/\.md$/, "");

      return {
        name,
        fileName,
        createdAt: stat.birthtime,
        size: stat.size,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Read an artifact's content by name (with or without .md extension).
 */
function readArtifact(
  projectPath: string,
  name: string
): { content: string; info: ArtifactInfo } | null {
  const artifactsDir = getLocusPath(projectPath, "artifactsDir");
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const filePath = join(artifactsDir, fileName);

  if (!existsSync(filePath)) {
    return null;
  }

  const stat = statSync(filePath);
  const content = readFileSync(filePath, "utf-8");

  return {
    content,
    info: {
      name: fileName.replace(/\.md$/, ""),
      fileName,
      createdAt: stat.birthtime,
      size: stat.size,
    },
  };
}

/**
 * Format file size for display.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)}MB`;
}

/**
 * Format a date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const result = readArtifact(projectPath, name);

  if (!result) {
    // Try partial match
    const artifacts = listArtifacts(projectPath);
    const matches = artifacts.filter((a) =>
      a.name.toLowerCase().includes(name.toLowerCase())
    );

    if (matches.length === 1) {
      const match = readArtifact(projectPath, matches[0].name);
      if (match) {
        printArtifact(match.info, match.content);
        return;
      }
    }

    if (matches.length > 1) {
      console.error(
        `\n  ${c.error("Error:")} Multiple artifacts match "${name}":\n`
      );
      for (const m of matches) {
        console.log(`    ${c.cyan(m.name)}`);
      }
      console.log();
      return;
    }

    console.error(`\n  ${c.error("Error:")} Artifact "${name}" not found\n`);
    console.log(
      `  ${c.dim("Use 'locus artifacts' to see available artifacts")}\n`
    );
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
  const result = readArtifact(projectPath, name);

  if (!result) {
    // Try partial match
    const artifacts = listArtifacts(projectPath);
    const matches = artifacts.filter((a) =>
      a.name.toLowerCase().includes(name.toLowerCase())
    );

    if (matches.length === 1) {
      const match = readArtifact(projectPath, matches[0].name);
      if (match) {
        await runPlanConversion(match.info.name);
        return;
      }
    }

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
    ${c.dim("$")} locus artifacts plan aws-instance-orchestration-prd

  ${c.dim("Artifact names can be partial matches.")}
`);
}

// Re-export utilities for use in telegram
export { listArtifacts, readArtifact, formatSize, formatDate };
export type { ArtifactInfo };
