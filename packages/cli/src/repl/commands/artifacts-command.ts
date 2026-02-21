import { c, getLocusPath } from "@locusai/sdk/node";
import {
  formatDate,
  formatSize,
  listArtifacts,
  readArtifact,
} from "../../commands/artifacts";
import type { REPLSession, SlashCommand } from "../slash-commands";
import { planCommand } from "./plan-command";

export const artifactsCommand: SlashCommand = {
  name: "artifacts",
  aliases: ["a"],
  description: "List, view, or convert artifacts",
  usage: "/artifacts | /artifacts show <name> | /artifacts plan <name>",
  category: "ai",
  execute: async (session: REPLSession, args?: string) => {
    const trimmed = (args ?? "").trim();

    // /artifacts show <name>
    if (trimmed.startsWith("show ") || trimmed.startsWith("view ")) {
      const name = trimmed.replace(/^(show|view)\s+/, "").trim();
      if (!name) {
        console.log(
          `\n  ${c.error("Usage:")} ${c.cyan("/artifacts show <name>")}\n`
        );
        return;
      }
      return showArtifact(session, name);
    }

    // /artifacts plan <name>
    if (trimmed.startsWith("plan ")) {
      const name = trimmed.replace(/^plan\s+/, "").trim();
      if (!name) {
        console.log(
          `\n  ${c.error("Usage:")} ${c.cyan("/artifacts plan <name>")}\n`
        );
        return;
      }
      return convertToPlan(session, name);
    }

    // /artifacts (no args) — list all
    if (!trimmed) {
      return listAllArtifacts(session);
    }

    showArtifactsHelp();
  },
};

// ── List ──────────────────────────────────────────────────────

function listAllArtifacts(session: REPLSession): void {
  const projectPath = session.getProjectPath();
  const artifacts = listArtifacts(projectPath);

  if (artifacts.length === 0) {
    console.log(`\n  ${c.dim("No artifacts found.")}\n`);
    return;
  }

  console.log(
    `\n  ${c.header(" ARTIFACTS ")} ${c.dim(`(${artifacts.length} total)`)}\n`
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
    `\n  ${c.dim("Use")} ${c.cyan("/artifacts show <name>")} ${c.dim("to view content")}`
  );
  console.log(
    `  ${c.dim("Use")} ${c.cyan("/artifacts plan <name>")} ${c.dim("to convert to a plan")}\n`
  );
}

// ── Show ──────────────────────────────────────────────────────

function showArtifact(session: REPLSession, name: string): void {
  const projectPath = session.getProjectPath();
  const result = readArtifact(projectPath, name);

  if (result) {
    printArtifact(result.info, result.content);
    return;
  }

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
    console.log(
      `\n  ${c.error("✖")} ${c.red(`Multiple artifacts match "${name}":`)}\n`
    );
    for (const m of matches) {
      console.log(`    ${c.cyan(m.name)}`);
    }
    console.log();
    return;
  }

  console.log(
    `\n  ${c.error("✖")} ${c.red(`Artifact "${name}" not found`)}\n`
  );
  console.log(
    `  ${c.dim("Use")} ${c.cyan("/artifacts")} ${c.dim("to see available artifacts")}\n`
  );
}

function printArtifact(
  info: { name: string; createdAt: Date; size: number },
  content: string
): void {
  const date = formatDate(info.createdAt);
  const size = formatSize(info.size);

  console.log(`\n  ${c.primary(info.name)}`);
  console.log(`  ${c.dim(`${date} • ${size}`)}`);
  console.log(c.dim("  ─".repeat(30)));
  console.log();
  console.log(content);
}

// ── Plan conversion ───────────────────────────────────────────

async function convertToPlan(
  session: REPLSession,
  name: string
): Promise<void> {
  const projectPath = session.getProjectPath();
  let artifactName: string | null = null;

  const result = readArtifact(projectPath, name);
  if (result) {
    artifactName = result.info.name;
  } else {
    // Try partial match
    const artifacts = listArtifacts(projectPath);
    const matches = artifacts.filter((a) =>
      a.name.toLowerCase().includes(name.toLowerCase())
    );

    if (matches.length === 1) {
      artifactName = matches[0].name;
    } else if (matches.length > 1) {
      console.log(
        `\n  ${c.error("✖")} ${c.red(`Multiple artifacts match "${name}":`)}\n`
      );
      for (const m of matches) {
        console.log(`    ${c.cyan(m.name)}`);
      }
      console.log();
      return;
    }
  }

  if (!artifactName) {
    console.log(
      `\n  ${c.error("✖")} ${c.red(`Artifact "${name}" not found`)}\n`
    );
    console.log(
      `  ${c.dim("Use")} ${c.cyan("/artifacts")} ${c.dim("to see available artifacts")}\n`
    );
    return;
  }

  console.log(
    `\n  ${c.info("●")} ${c.bold("Converting artifact to plan:")} ${c.cyan(artifactName)}\n`
  );

  const directive = `Prepare a plan according to the artifact: ${artifactName}`;
  await planCommand.execute(session, directive);
}

// ── Help ──────────────────────────────────────────────────────

function showArtifactsHelp(): void {
  console.log(`
  ${c.header(" ARTIFACTS ")} ${c.dim("— Manage Project Artifacts")}

    ${c.cyan("/artifacts")}               List all artifacts
    ${c.cyan("/artifacts show <name>")}   Show artifact content
    ${c.cyan("/artifacts plan <name>")}   Convert artifact to a plan

  ${c.dim("Artifact names support partial matching.")}
`);
}
