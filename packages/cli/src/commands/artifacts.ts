/**
 * `locus artifacts` — View and manage AI-generated artifacts.
 *
 * Artifacts are markdown files stored in `.locus/artifacts/` produced
 * by AI agents during task execution.
 *
 * Usage:
 *   locus artifacts              List all artifacts (sorted by creation time)
 *   locus artifacts show <name>  Show artifact content
 *   locus artifacts plan <name>  Convert artifact to a plan
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { bold, cyan, dim, red } from "../display/terminal.js";

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("locus artifacts")} — View and manage AI-generated artifacts

${bold("Usage:")}
  locus artifacts              ${dim("# List all artifacts")}
  locus artifacts show <name>  ${dim("# Show artifact content")}
  locus artifacts plan <name>  ${dim("# Convert artifact to a plan")}

${bold("Examples:")}
  locus artifacts
  locus artifacts show reduce-cli-terminal-output
  locus artifacts plan aws-instance-orchestration-prd

${dim("Artifact names support partial matching.")}

`);
}

// ─── Paths ────────────────────────────────────────────────────────────────────

function getArtifactsDir(projectRoot: string): string {
  return join(projectRoot, ".locus", "artifacts");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtifactInfo {
  name: string;
  fileName: string;
  createdAt: Date;
  size: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function listArtifacts(projectRoot: string): ArtifactInfo[] {
  const dir = getArtifactsDir(projectRoot);

  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((fileName) => {
      const filePath = join(dir, fileName);
      const stat = statSync(filePath);
      return {
        name: fileName.replace(/\.md$/, ""),
        fileName,
        createdAt: stat.birthtime,
        size: stat.size,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function readArtifact(
  projectRoot: string,
  name: string
): { content: string; info: ArtifactInfo } | null {
  const dir = getArtifactsDir(projectRoot);
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const filePath = join(dir, fileName);

  if (!existsSync(filePath)) return null;

  const stat = statSync(filePath);
  return {
    content: readFileSync(filePath, "utf-8"),
    info: {
      name: fileName.replace(/\.md$/, ""),
      fileName,
      createdAt: stat.birthtime,
      size: stat.size,
    },
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Command ──────────────────────────────────────────────────────────────────

export async function artifactsCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  if (args[0] === "help") {
    printHelp();
    return;
  }

  const subcommand = args[0];

  switch (subcommand) {
    case "show":
    case "view": {
      const name = args.slice(1).join(" ").trim();
      if (!name) {
        process.stderr.write(`${red("✗")} Please provide an artifact name.\n`);
        process.stderr.write(
          `  Usage: ${bold("locus artifacts show <name>")}\n`
        );
        return;
      }
      showArtifact(projectRoot, name);
      break;
    }

    case "plan": {
      const name = args.slice(1).join(" ").trim();
      if (!name) {
        process.stderr.write(`${red("✗")} Please provide an artifact name.\n`);
        process.stderr.write(
          `  Usage: ${bold("locus artifacts plan <name>")}\n`
        );
        return;
      }
      await convertToPlan(projectRoot, name);
      break;
    }

    default:
      listArtifactsCommand(projectRoot);
      break;
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

function listArtifactsCommand(projectRoot: string): void {
  const artifacts = listArtifacts(projectRoot);

  if (artifacts.length === 0) {
    process.stderr.write(`${dim("No artifacts found.")}\n`);
    return;
  }

  process.stderr.write(
    `\n${bold("Artifacts")} ${dim(`(${artifacts.length} total)`)}\n\n`
  );

  for (let i = 0; i < artifacts.length; i++) {
    const a = artifacts[i];
    const idx = dim(`${String(i + 1).padStart(2)}.`);
    process.stderr.write(`  ${idx} ${cyan(a.name)}\n`);
    process.stderr.write(
      `      ${dim(`${formatDate(a.createdAt)} • ${formatSize(a.size)}`)}\n`
    );
  }

  process.stderr.write(
    `\n  ${dim("Use")} ${bold("locus artifacts show <name>")} ${dim("to view content")}\n`
  );
  process.stderr.write(
    `  ${dim("Use")} ${bold("locus artifacts plan <name>")} ${dim("to convert to a plan")}\n\n`
  );
}

// ─── Show ─────────────────────────────────────────────────────────────────────

function showArtifact(projectRoot: string, name: string): void {
  const result = readArtifact(projectRoot, name);

  if (!result) {
    // Try partial match
    const artifacts = listArtifacts(projectRoot);
    const matches = artifacts.filter((a) =>
      a.name.toLowerCase().includes(name.toLowerCase())
    );

    if (matches.length === 1) {
      const match = readArtifact(projectRoot, matches[0].name);
      if (match) {
        printArtifact(match.info, match.content);
        return;
      }
    }

    if (matches.length > 1) {
      process.stderr.write(`${red("✗")} Multiple artifacts match "${name}":\n`);
      for (const m of matches) {
        process.stderr.write(`  ${cyan(m.name)}\n`);
      }
      return;
    }

    process.stderr.write(`${red("✗")} Artifact "${name}" not found.\n`);
    process.stderr.write(
      `  Run ${bold("locus artifacts")} to see available artifacts.\n`
    );
    return;
  }

  printArtifact(result.info, result.content);
}

function printArtifact(info: ArtifactInfo, content: string): void {
  const line = dim("─".repeat(50));
  process.stderr.write(
    `\n${bold(info.name)}\n${dim(`${formatDate(info.createdAt)} • ${formatSize(info.size)}`)}\n${line}\n\n`
  );
  process.stdout.write(`${content}\n`);
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

async function convertToPlan(projectRoot: string, name: string): Promise<void> {
  const result = readArtifact(projectRoot, name);

  if (!result) {
    // Try partial match
    const artifacts = listArtifacts(projectRoot);
    const matches = artifacts.filter((a) =>
      a.name.toLowerCase().includes(name.toLowerCase())
    );

    if (matches.length === 1) {
      await runPlanConversion(projectRoot, matches[0].name);
      return;
    }

    process.stderr.write(`${red("✗")} Artifact "${name}" not found.\n`);
    process.stderr.write(
      `  Run ${bold("locus artifacts")} to see available artifacts.\n`
    );
    return;
  }

  await runPlanConversion(projectRoot, result.info.name);
}

async function runPlanConversion(
  projectRoot: string,
  artifactName: string
): Promise<void> {
  const { execCommand } = await import("./exec.js");

  process.stderr.write(
    `\n${bold("Converting artifact to plan:")} ${cyan(artifactName)}\n\n`
  );

  await execCommand(
    projectRoot,
    [`Create a plan according to ${artifactName}`],
    {}
  );
}

// Re-export utilities for use elsewhere
export { listArtifacts, readArtifact, formatSize, formatDate };
export type { ArtifactInfo };
