import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOCUS_GITIGNORE_PATTERNS } from "@locusai/sdk/node";
import { LOCUS_GITIGNORE_MARKER } from "./templates.js";

/**
 * Updates or creates .gitignore with locus-specific patterns.
 * If locus patterns already exist, replaces them with the current set.
 * This ensures new patterns (e.g. reviews/, plans/) are added on reinit.
 */
export function updateGitignore(projectPath: string): void {
  const gitignorePath = join(projectPath, ".gitignore");
  let content = "";
  const locusBlock = LOCUS_GITIGNORE_PATTERNS.join("\n");

  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, "utf-8");

    if (content.includes(LOCUS_GITIGNORE_MARKER)) {
      // Find the existing locus block and replace it.
      // The block starts at the first "# Locus AI" line and continues
      // through all consecutive comment/pattern lines until a blank line
      // followed by non-locus content or end of file.
      const lines = content.split("\n");
      const startIdx = lines.findIndex((l) =>
        l.includes(LOCUS_GITIGNORE_MARKER)
      );
      let endIdx = startIdx;

      // Walk forward past all lines that are part of the locus block:
      // comment lines starting with "# Locus AI", pattern lines, and empty separator lines
      for (let i = startIdx; i < lines.length; i++) {
        if (
          lines[i].startsWith(LOCUS_GITIGNORE_MARKER) ||
          lines[i].startsWith(".locus") ||
          lines[i].trim() === ""
        ) {
          endIdx = i;
        } else {
          break;
        }
      }

      // Replace the old block with the current patterns
      const before = lines.slice(0, startIdx);
      const after = lines.slice(endIdx + 1);

      content = [...before, locusBlock, ...after].join("\n");
      writeFileSync(gitignorePath, content);
      return;
    }

    // No existing locus block — append
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }

    if (content.trim().length > 0) {
      content += "\n";
    }
  }

  content += `${locusBlock}\n`;
  writeFileSync(gitignorePath, content);
}

/**
 * Ensures a git identity (user.name / user.email) is configured locally for
 * the project so commits don't fall back to the hostname-based default
 * (e.g. Ubuntu <ubuntu@ip-...>).  Only sets values when the current local
 * config is empty — it will never overwrite an existing identity.
 */
export function ensureGitIdentity(projectPath: string): void {
  const hasName = (() => {
    try {
      return execSync("git config --get user.name", {
        cwd: projectPath,
        stdio: ["pipe", "pipe", "pipe"],
      })
        .toString()
        .trim();
    } catch {
      return "";
    }
  })();

  const hasEmail = (() => {
    try {
      return execSync("git config --get user.email", {
        cwd: projectPath,
        stdio: ["pipe", "pipe", "pipe"],
      })
        .toString()
        .trim();
    } catch {
      return "";
    }
  })();

  if (!hasName) {
    execSync('git config user.name "LocusAgent"', {
      cwd: projectPath,
      stdio: "ignore",
    });
  }

  if (!hasEmail) {
    execSync('git config user.email "agent@locusai.team"', {
      cwd: projectPath,
      stdio: "ignore",
    });
  }

  execSync("git config --global pull.rebase true", {
    cwd: projectPath,
    stdio: "ignore",
  });
}
