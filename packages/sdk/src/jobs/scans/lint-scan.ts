import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ChangeCategory,
  JobType,
  SuggestionType,
} from "@locusai/shared";
import { BaseJob } from "../base-job.js";
import type { JobContext, JobResult, JobSuggestion } from "../base-job.js";
import {
  detectRemoteProvider,
  getDefaultBranch,
  isGhAvailable,
} from "../../git/git-utils.js";

// ============================================================================
// Types
// ============================================================================

type LinterKind = "biome" | "eslint";

interface DetectedLinter {
  kind: LinterKind;
  checkCommand: string[];
  fixCommand: string[];
}

interface LintOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ParsedLintResult {
  errors: number;
  warnings: number;
  raw: string;
}

// ============================================================================
// Lint Scan Job
// ============================================================================

export class LintScanJob extends BaseJob {
  readonly type = JobType.LINT_SCAN;
  readonly name = "Linting Scan";

  async run(context: JobContext): Promise<JobResult> {
    const { projectPath, autonomyRules } = context;

    // 1. Detect linter
    const linter = this.detectLinter(projectPath);
    if (!linter) {
      return {
        summary: "No linter configuration detected",
        suggestions: [],
        filesChanged: 0,
      };
    }

    // 2. Run linter in check-only mode
    let lintOutput: LintOutput;
    try {
      lintOutput = this.runLinter(linter.checkCommand, projectPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        summary: `Linting scan failed: ${message}`,
        suggestions: [],
        filesChanged: 0,
        errors: [message],
      };
    }

    // 3. Parse results
    const parsed = this.parseLintOutput(linter.kind, lintOutput);

    // No issues found
    if (parsed.errors === 0 && parsed.warnings === 0) {
      return {
        summary: `Linting scan passed — no issues found (${linter.kind})`,
        suggestions: [],
        filesChanged: 0,
      };
    }

    // 4. Check if auto-fix is allowed
    const canAutoFix = this.shouldAutoExecute(
      ChangeCategory.STYLE,
      autonomyRules
    );

    if (canAutoFix) {
      return this.autoFix(linter, parsed, context);
    }

    // 5. Not auto-fixing — return suggestions
    return this.buildSuggestionResult(linter, parsed);
  }

  // ==========================================================================
  // Linter Detection
  // ==========================================================================

  private detectLinter(projectPath: string): DetectedLinter | null {
    // Check for Biome
    if (existsSync(join(projectPath, "biome.json")) || existsSync(join(projectPath, "biome.jsonc"))) {
      return {
        kind: "biome",
        checkCommand: ["bunx", "biome", "check", "."],
        fixCommand: ["bunx", "biome", "check", "--fix", "."],
      };
    }

    // Check for ESLint — config file patterns
    const eslintConfigPatterns = [
      ".eslintrc",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.json",
      ".eslintrc.yml",
      ".eslintrc.yaml",
    ];

    for (const config of eslintConfigPatterns) {
      if (existsSync(join(projectPath, config))) {
        return {
          kind: "eslint",
          checkCommand: ["npx", "eslint", "."],
          fixCommand: ["npx", "eslint", "--fix", "."],
        };
      }
    }

    // Check for eslint.config.* (flat config)
    try {
      const files = readdirSync(projectPath);
      const hasFlatConfig = files.some(
        (f) => f.startsWith("eslint.config.") && /\.(js|cjs|mjs|ts|cts|mts)$/.test(f)
      );
      if (hasFlatConfig) {
        return {
          kind: "eslint",
          checkCommand: ["npx", "eslint", "."],
          fixCommand: ["npx", "eslint", "--fix", "."],
        };
      }
    } catch {
      // Directory read failed — skip
    }

    return null;
  }

  // ==========================================================================
  // Linter Execution
  // ==========================================================================

  private runLinter(command: string[], projectPath: string): LintOutput {
    const [bin, ...args] = command;
    try {
      const stdout = execFileSync(bin, args, {
        cwd: projectPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000, // 2 minutes
      });
      return { stdout, stderr: "", exitCode: 0 };
    } catch (err: unknown) {
      // Linters exit with non-zero when issues are found — that's expected
      if (isExecError(err)) {
        return {
          stdout: (err.stdout as string) ?? "",
          stderr: (err.stderr as string) ?? "",
          exitCode: err.status ?? 1,
        };
      }
      throw err;
    }
  }

  // ==========================================================================
  // Output Parsing
  // ==========================================================================

  private parseLintOutput(
    kind: LinterKind,
    output: LintOutput
  ): ParsedLintResult {
    const combined = `${output.stdout}\n${output.stderr}`;

    if (kind === "biome") {
      return this.parseBiomeOutput(combined);
    }
    return this.parseEslintOutput(combined);
  }

  private parseBiomeOutput(raw: string): ParsedLintResult {
    // Biome summary line: "Found N errors." or "Found N warnings."
    let errors = 0;
    let warnings = 0;

    const errorMatch = raw.match(/Found (\d+) error/i);
    if (errorMatch) {
      errors = parseInt(errorMatch[1], 10);
    }

    const warningMatch = raw.match(/Found (\d+) warning/i);
    if (warningMatch) {
      warnings = parseInt(warningMatch[1], 10);
    }

    // Fallback: count diagnostic lines if summary not found
    if (errors === 0 && warnings === 0) {
      const diagnosticLines = raw
        .split("\n")
        .filter((line) => /\s+(error|warning)\[/.test(line));
      errors = diagnosticLines.filter((l) => /\serror\[/.test(l)).length;
      warnings = diagnosticLines.filter((l) => /\swarning\[/.test(l)).length;
    }

    return { errors, warnings, raw };
  }

  private parseEslintOutput(raw: string): ParsedLintResult {
    let errors = 0;
    let warnings = 0;

    // ESLint summary line: "X problems (Y errors, Z warnings)"
    const summaryMatch = raw.match(
      /(\d+) problems?\s*\((\d+) errors?,\s*(\d+) warnings?\)/
    );
    if (summaryMatch) {
      errors = parseInt(summaryMatch[2], 10);
      warnings = parseInt(summaryMatch[3], 10);
    } else {
      // Fallback: count individual issue lines (file:line:col format)
      const issueLines = raw
        .split("\n")
        .filter((line) => /^\s+\d+:\d+\s+(error|warning)\s/.test(line));
      errors = issueLines.filter((l) => /\serror\s/.test(l)).length;
      warnings = issueLines.filter((l) => /\swarning\s/.test(l)).length;
    }

    return { errors, warnings, raw };
  }

  // ==========================================================================
  // Auto-Fix
  // ==========================================================================

  private autoFix(
    linter: DetectedLinter,
    parsed: ParsedLintResult,
    context: JobContext
  ): JobResult {
    const { projectPath } = context;

    // Run linter with --fix
    try {
      this.runLinter(linter.fixCommand, projectPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        summary: `Lint auto-fix failed: ${message}`,
        suggestions: [],
        filesChanged: 0,
        errors: [message],
      };
    }

    // Detect changed files
    let changedFiles: string[];
    try {
      const diffOutput = execFileSync(
        "git",
        ["diff", "--name-only"],
        {
          cwd: projectPath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      ).trim();
      changedFiles = diffOutput ? diffOutput.split("\n") : [];
    } catch {
      changedFiles = [];
    }

    if (changedFiles.length === 0) {
      return {
        summary: `Linting scan found ${this.issueCountSummary(parsed)} but auto-fix made no changes (${linter.kind})`,
        suggestions: this.buildIssueSuggestions(linter, parsed),
        filesChanged: 0,
      };
    }

    // Create branch, commit, and push
    const prUrl = this.commitAndPush(
      projectPath,
      changedFiles,
      linter,
      parsed
    );

    const summary = prUrl
      ? `Auto-fixed ${this.issueCountSummary(parsed)} across ${changedFiles.length} file(s) — PR created (${linter.kind})`
      : `Auto-fixed ${this.issueCountSummary(parsed)} across ${changedFiles.length} file(s) (${linter.kind})`;

    return {
      summary,
      suggestions: [],
      filesChanged: changedFiles.length,
      prUrl: prUrl ?? undefined,
    };
  }

  private commitAndPush(
    projectPath: string,
    changedFiles: string[],
    linter: DetectedLinter,
    parsed: ParsedLintResult
  ): string | null {
    try {
      const defaultBranch = getDefaultBranch(projectPath);
      const branchName = `locus/lint-fix-${Date.now().toString(36)}`;

      // Create and checkout branch
      this.gitExec(["checkout", "-b", branchName], projectPath);

      // Stage changed files
      this.gitExec(["add", ...changedFiles], projectPath);

      // Commit
      const commitMessage = `fix(lint): auto-fix ${this.issueCountSummary(parsed)} via ${linter.kind}\n\nAgent: locus-lint-scan\nCo-authored-by: LocusAI <agent@locusai.team>`;
      this.gitExec(["commit", "-m", commitMessage], projectPath);

      // Push
      this.gitExec(
        ["push", "-u", "origin", branchName],
        projectPath
      );

      // Create PR if gh is available and remote is GitHub
      let prUrl: string | null = null;
      if (
        detectRemoteProvider(projectPath) === "github" &&
        isGhAvailable(projectPath)
      ) {
        try {
          const title = `[Locus] Auto-fix lint issues (${this.issueCountSummary(parsed)})`;
          const body = [
            "## Summary",
            "",
            `Automated lint fixes applied by Locus using \`${linter.kind}\`.`,
            "",
            `- **Issues found**: ${parsed.errors} error(s), ${parsed.warnings} warning(s)`,
            `- **Files changed**: ${changedFiles.length}`,
            "",
            "### Changed files",
            "",
            ...changedFiles.map((f) => `- \`${f}\``),
            "",
            "---",
            "*Created by Locus Agent (lint-scan)*",
          ].join("\n");

          prUrl = execFileSync(
            "gh",
            [
              "pr",
              "create",
              "--title",
              title,
              "--body",
              body,
              "--base",
              defaultBranch,
              "--head",
              branchName,
            ],
            {
              cwd: projectPath,
              encoding: "utf-8",
              stdio: ["pipe", "pipe", "pipe"],
            }
          ).trim();
        } catch {
          // PR creation failed — still return the branch result
        }
      }

      // Checkout the original branch back
      try {
        this.gitExec(["checkout", defaultBranch], projectPath);
      } catch {
        // Non-critical — agent may be in detached HEAD
      }

      return prUrl;
    } catch {
      // Git operations failed — return null to indicate no PR
      return null;
    }
  }

  // ==========================================================================
  // Suggestion Building
  // ==========================================================================

  private buildSuggestionResult(
    linter: DetectedLinter,
    parsed: ParsedLintResult
  ): JobResult {
    return {
      summary: `Linting scan found ${this.issueCountSummary(parsed)} (${linter.kind})`,
      suggestions: this.buildIssueSuggestions(linter, parsed),
      filesChanged: 0,
    };
  }

  private buildIssueSuggestions(
    linter: DetectedLinter,
    parsed: ParsedLintResult
  ): JobSuggestion[] {
    const suggestions: JobSuggestion[] = [];

    if (parsed.errors > 0) {
      suggestions.push({
        type: SuggestionType.CODE_FIX,
        title: `Fix ${parsed.errors} lint error(s)`,
        description: `The ${linter.kind} linter found ${parsed.errors} error(s). Run \`${linter.fixCommand.join(" ")}\` to auto-fix, or review the issues manually.`,
        metadata: { linter: linter.kind, errors: parsed.errors },
      });
    }

    if (parsed.warnings > 0) {
      suggestions.push({
        type: SuggestionType.CODE_FIX,
        title: `Resolve ${parsed.warnings} lint warning(s)`,
        description: `The ${linter.kind} linter found ${parsed.warnings} warning(s). Run \`${linter.fixCommand.join(" ")}\` to auto-fix, or review the issues manually.`,
        metadata: { linter: linter.kind, warnings: parsed.warnings },
      });
    }

    return suggestions;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private issueCountSummary(parsed: ParsedLintResult): string {
    const parts: string[] = [];
    if (parsed.errors > 0) parts.push(`${parsed.errors} error(s)`);
    if (parsed.warnings > 0) parts.push(`${parsed.warnings} warning(s)`);
    return parts.join(", ") || "0 issues";
  }

  private gitExec(args: string[], cwd: string): string {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  }
}

// ============================================================================
// Utilities
// ============================================================================

interface ExecError {
  stdout: unknown;
  stderr: unknown;
  status: number | null;
}

function isExecError(err: unknown): err is ExecError {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    "stdout" in err
  );
}
