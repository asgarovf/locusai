import { c } from "@locusai/sdk/node";
import { ConfigManager } from "../config-manager";
import { isProjectInitialized, VERSION } from "../utils";

export async function initCommand(): Promise<void> {
  const projectPath = process.cwd();
  const configManager = new ConfigManager(projectPath);

  if (isProjectInitialized(projectPath)) {
    // Reinitialize - update version, ensure all directories exist, update gitignore
    console.log(
      `\n  ${c.info("ℹ️")}  ${c.bold("Locus is already initialized. Updating configuration...")}\n`
    );

    const result = await configManager.reinit(VERSION);

    const updates: string[] = [];

    if (result.versionUpdated) {
      updates.push(
        `Version updated: ${c.dim(result.previousVersion || "unknown")} → ${c.primary(VERSION)}`
      );
    }

    if (result.directoriesCreated.length > 0) {
      updates.push(
        `Directories created: ${result.directoriesCreated.map((d) => c.dim(d)).join(", ")}`
      );
    }

    if (result.skillsCreated.length > 0) {
      const skillCount = result.skillsCreated.length;
      updates.push(`Skills created: ${c.dim(`${skillCount} new skill(s)`)}`);
    }

    if (result.gitignoreUpdated) {
      updates.push(`Gitignore updated with Locus patterns`);
    }

    if (updates.length === 0) {
      console.log(`  ${c.success("✔")} ${c.success("Configuration is already up to date!")}

  ${c.dim(`Version: ${VERSION}`)}`);
    } else {
      console.log(`  ${c.success("✔")} ${c.success("Configuration updated successfully!")}

  ${c.bold("Changes:")}
    ${updates.map((u) => `${c.primary("•")} ${u}`).join("\n    ")}
`);
    }

    console.log(`  ${c.bold("Next steps:")}
    1. Run '${c.primary("locus index")}' to index your codebase
    2. Run '${c.primary("locus run")}' to start an agent (requires --api-key)

  For more information, visit: ${c.underline("https://locusai.dev/docs")}
`);
    return;
  }

  await configManager.init(VERSION);
  console.log(`
  ${c.success("✨ Locus initialized successfully!")}

  ${c.bold("Created:")}
    ${c.primary("📁")} ${c.bold(".locus/")}             ${c.dim("Configuration directory")}
    ${c.primary("📄")} ${c.bold(".locus/config.json")} ${c.dim("Project settings")}
    ${c.primary("📝")} ${c.bold("CLAUDE.md")}          ${c.dim("AI instructions & context")}
    ${c.primary("📁")} ${c.bold(".agent/skills/")}     ${c.dim("Domain-specific agent skills")}

  ${c.bold("Next steps:")}
    1. Run '${c.primary("locus index")}' to index your codebase
    2. Run '${c.primary("locus run")}' to start an agent (requires --api-key)

  For more information, visit: ${c.underline("https://locusai.dev/docs")}
`);
}
