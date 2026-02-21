import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
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

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

type RiskLevel = "patch" | "minor" | "major";

interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  risk: RiskLevel;
}

interface AuditVulnerability {
  name: string;
  severity: string;
  title: string;
  url?: string;
}

interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ============================================================================
// Dependency Scan Job
// ============================================================================

export class DependencyScanJob extends BaseJob {
  readonly type = JobType.DEPENDENCY_CHECK;
  readonly name = "Dependency Check";

  async run(context: JobContext): Promise<JobResult> {
    const { projectPath, autonomyRules } = context;

    // 1. Detect package manager
    const pm = this.detectPackageManager(projectPath);
    if (!pm) {
      return {
        summary: "No package manager lock file detected",
        suggestions: [],
        filesChanged: 0,
      };
    }

    // 2. Run outdated check
    let outdated: OutdatedPackage[];
    try {
      outdated = this.getOutdatedPackages(pm, projectPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        summary: `Dependency check failed (outdated): ${message}`,
        suggestions: [],
        filesChanged: 0,
        errors: [message],
      };
    }

    // 3. Run security audit
    let vulnerabilities: AuditVulnerability[];
    try {
      vulnerabilities = this.runSecurityAudit(pm, projectPath);
    } catch {
      vulnerabilities = [];
    }

    // 4. Categorize by risk level
    const patch = outdated.filter((p) => p.risk === "patch");
    const minor = outdated.filter((p) => p.risk === "minor");
    const major = outdated.filter((p) => p.risk === "major");

    // 5. Check if auto-update is allowed
    const canAutoExecute = this.shouldAutoExecute(
      ChangeCategory.DEPENDENCY,
      autonomyRules
    );

    let filesChanged = 0;
    let prUrl: string | undefined;

    if (canAutoExecute && (patch.length > 0 || minor.length > 0) && major.length === 0) {
      const autoResult = this.autoUpdate(pm, patch, minor, projectPath);
      filesChanged = autoResult.filesChanged;
      prUrl = autoResult.prUrl ?? undefined;
    }

    // 6. Build suggestions
    const suggestions = this.buildSuggestions(patch, minor, major, pm);

    // 7. Build summary
    const summaryParts: string[] = [];
    if (outdated.length > 0) {
      summaryParts.push(
        `${outdated.length} outdated (${patch.length} patch, ${minor.length} minor, ${major.length} major)`
      );
    } else {
      summaryParts.push("all dependencies up to date");
    }
    if (vulnerabilities.length > 0) {
      summaryParts.push(`${vulnerabilities.length} vulnerability(ies)`);
    }
    if (filesChanged > 0) {
      summaryParts.push(
        `auto-updated ${patch.length + minor.length} safe package(s)`
      );
    }

    const summary = `Dependency check: ${summaryParts.join(", ")} (${pm})`;

    return {
      summary,
      suggestions,
      filesChanged,
      prUrl,
    };
  }

  // ==========================================================================
  // Package Manager Detection
  // ==========================================================================

  private detectPackageManager(projectPath: string): PackageManager | null {
    if (existsSync(join(projectPath, "bun.lock"))) return "bun";
    if (existsSync(join(projectPath, "pnpm-lock.yaml"))) return "pnpm";
    if (existsSync(join(projectPath, "yarn.lock"))) return "yarn";
    if (existsSync(join(projectPath, "package-lock.json"))) return "npm";
    return null;
  }

  // ==========================================================================
  // Outdated Packages
  // ==========================================================================

  private getOutdatedPackages(
    pm: PackageManager,
    projectPath: string
  ): OutdatedPackage[] {
    const output = this.runOutdatedCommand(pm, projectPath);

    if (pm === "bun") {
      return this.parseBunOutdated(output.stdout);
    }

    // npm, pnpm, and yarn --json all produce JSON output
    return this.parseJsonOutdated(pm, output.stdout);
  }

  private runOutdatedCommand(
    pm: PackageManager,
    projectPath: string
  ): CommandOutput {
    const commands: Record<PackageManager, string[]> = {
      bun: ["bun", "outdated"],
      npm: ["npm", "outdated", "--json"],
      pnpm: ["pnpm", "outdated", "--format", "json"],
      yarn: ["yarn", "outdated", "--json"],
    };

    const [bin, ...args] = commands[pm];
    return this.exec(bin, args, projectPath);
  }

  private parseBunOutdated(stdout: string): OutdatedPackage[] {
    const packages: OutdatedPackage[] = [];
    const lines = stdout.split("\n");

    // bun outdated outputs a table with headers:
    // Package | Current | Update | Latest
    for (const line of lines) {
      // Match table rows: | package | current | update | latest |
      const match = line.match(
        /^\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|?\s*$/
      );
      if (!match) continue;

      const [, name, current, , latest] = match;
      if (!name || !current || !latest || name === "Package") continue;

      packages.push({
        name,
        current,
        wanted: latest,
        latest,
        risk: this.classifyRisk(current, latest),
      });
    }

    return packages;
  }

  private parseJsonOutdated(
    pm: PackageManager,
    stdout: string
  ): OutdatedPackage[] {
    const packages: OutdatedPackage[] = [];

    if (!stdout.trim()) return packages;

    if (pm === "yarn") {
      return this.parseYarnOutdated(stdout);
    }

    // npm and pnpm produce { "package-name": { current, wanted, latest } }
    let data: Record<
      string,
      { current?: string; wanted?: string; latest?: string }
    >;
    try {
      data = JSON.parse(stdout);
    } catch {
      return packages;
    }

    for (const [name, info] of Object.entries(data)) {
      const current = info.current ?? "0.0.0";
      const wanted = info.wanted ?? current;
      const latest = info.latest ?? wanted;

      packages.push({
        name,
        current,
        wanted,
        latest,
        risk: this.classifyRisk(current, latest),
      });
    }

    return packages;
  }

  private parseYarnOutdated(stdout: string): OutdatedPackage[] {
    const packages: OutdatedPackage[] = [];

    // yarn outdated --json outputs newline-delimited JSON objects
    // The "data" type object has a "body" array of [name, current, wanted, latest, ...]
    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.type === "table" && Array.isArray(obj.data?.body)) {
          for (const row of obj.data.body) {
            if (!Array.isArray(row) || row.length < 4) continue;
            const [name, current, wanted, latest] = row as string[];
            packages.push({
              name,
              current,
              wanted,
              latest,
              risk: this.classifyRisk(current, latest),
            });
          }
        }
      } catch {
        // Skip non-JSON lines
      }
    }

    return packages;
  }

  // ==========================================================================
  // Security Audit
  // ==========================================================================

  private runSecurityAudit(
    pm: PackageManager,
    projectPath: string
  ): AuditVulnerability[] {
    const commands: Record<PackageManager, string[]> = {
      bun: ["bun", "audit"],
      npm: ["npm", "audit", "--json"],
      pnpm: ["pnpm", "audit", "--json"],
      yarn: ["yarn", "audit", "--json"],
    };

    const [bin, ...args] = commands[pm];
    const output = this.exec(bin, args, projectPath);

    if (pm === "npm" || pm === "pnpm") {
      return this.parseNpmAudit(output.stdout);
    }

    // For bun/yarn, parse as best-effort
    return this.parseGenericAudit(output.stdout);
  }

  private parseNpmAudit(stdout: string): AuditVulnerability[] {
    const vulnerabilities: AuditVulnerability[] = [];

    if (!stdout.trim()) return vulnerabilities;

    try {
      const data = JSON.parse(stdout);
      const vulns = data.vulnerabilities ?? data.advisories ?? {};

      for (const [name, info] of Object.entries(vulns)) {
        const v = info as Record<string, unknown>;
        vulnerabilities.push({
          name,
          severity: (v.severity as string) ?? "unknown",
          title: (v.title as string) ?? (v.overview as string) ?? name,
          url: (v.url as string) ?? undefined,
        });
      }
    } catch {
      // Parse failed — return empty
    }

    return vulnerabilities;
  }

  private parseGenericAudit(stdout: string): AuditVulnerability[] {
    const vulnerabilities: AuditVulnerability[] = [];

    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.type === "auditAdvisory" && obj.data?.advisory) {
          const adv = obj.data.advisory;
          vulnerabilities.push({
            name: adv.module_name ?? "unknown",
            severity: adv.severity ?? "unknown",
            title: adv.title ?? "Unknown vulnerability",
            url: adv.url,
          });
        }
      } catch {
        // Skip non-JSON lines
      }
    }

    return vulnerabilities;
  }

  // ==========================================================================
  // Auto-Update
  // ==========================================================================

  private autoUpdate(
    pm: PackageManager,
    patch: OutdatedPackage[],
    minor: OutdatedPackage[],
    projectPath: string
  ): { filesChanged: number; prUrl: string | null } {
    const safePackages = [...patch, ...minor];

    try {
      // Update packages using the appropriate package manager
      this.runUpdateCommand(pm, safePackages, projectPath);

      // Install to update lock file
      this.runInstallCommand(pm, projectPath);
    } catch {
      return { filesChanged: 0, prUrl: null };
    }

    // Check for actual changes
    let changedFiles: string[];
    try {
      const diffOutput = execFileSync("git", ["diff", "--name-only"], {
        cwd: projectPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      changedFiles = diffOutput ? diffOutput.split("\n") : [];
    } catch {
      changedFiles = [];
    }

    if (changedFiles.length === 0) {
      return { filesChanged: 0, prUrl: null };
    }

    // Create branch, commit, push
    const prUrl = this.commitAndPush(
      projectPath,
      changedFiles,
      safePackages,
      pm
    );

    return { filesChanged: changedFiles.length, prUrl };
  }

  private runUpdateCommand(
    pm: PackageManager,
    packages: OutdatedPackage[],
    projectPath: string
  ): void {
    const pkgSpecs = packages.map((p) => `${p.name}@${p.latest}`);

    switch (pm) {
      case "bun":
        this.exec("bun", ["add", ...pkgSpecs], projectPath);
        break;
      case "npm":
        this.exec("npm", ["install", ...pkgSpecs], projectPath);
        break;
      case "pnpm":
        this.exec("pnpm", ["add", ...pkgSpecs], projectPath);
        break;
      case "yarn":
        this.exec("yarn", ["add", ...pkgSpecs], projectPath);
        break;
    }
  }

  private runInstallCommand(
    pm: PackageManager,
    projectPath: string
  ): void {
    const commands: Record<PackageManager, string[]> = {
      bun: ["bun", "install"],
      npm: ["npm", "install"],
      pnpm: ["pnpm", "install"],
      yarn: ["yarn", "install"],
    };

    const [bin, ...args] = commands[pm];
    this.exec(bin, args, projectPath);
  }

  private commitAndPush(
    projectPath: string,
    changedFiles: string[],
    packages: OutdatedPackage[],
    pm: PackageManager
  ): string | null {
    try {
      const defaultBranch = getDefaultBranch(projectPath);
      const branchName = `locus/dep-update-${Date.now().toString(36)}`;

      // Create and checkout branch
      this.gitExec(["checkout", "-b", branchName], projectPath);

      // Stage changed files
      this.gitExec(["add", ...changedFiles], projectPath);

      // Commit
      const packageList = packages.map((p) => `${p.name}@${p.latest}`).join(", ");
      const commitMessage = `fix(deps): update ${packages.length} safe dependencies\n\nUpdated: ${packageList}\nPackage manager: ${pm}\nAgent: locus-dependency-check\nCo-authored-by: LocusAI <agent@locusai.team>`;
      this.gitExec(["commit", "-m", commitMessage], projectPath);

      // Push
      this.gitExec(["push", "-u", "origin", branchName], projectPath);

      // Create PR if gh is available and remote is GitHub
      let prUrl: string | null = null;
      if (
        detectRemoteProvider(projectPath) === "github" &&
        isGhAvailable(projectPath)
      ) {
        try {
          const title = `[Locus] Update ${packages.length} safe dependencies`;
          const body = [
            "## Summary",
            "",
            `Automated dependency updates applied by Locus using \`${pm}\`.`,
            "",
            "### Updated packages",
            "",
            ...packages.map(
              (p) =>
                `- \`${p.name}\`: ${p.current} → ${p.latest} (${p.risk})`
            ),
            "",
            `- **Files changed**: ${changedFiles.length}`,
            "",
            "---",
            "*Created by Locus Agent (dependency-check)*",
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

      // Checkout back to the original branch
      try {
        this.gitExec(["checkout", defaultBranch], projectPath);
      } catch {
        // Non-critical
      }

      return prUrl;
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Suggestion Building
  // ==========================================================================

  private buildSuggestions(
    patch: OutdatedPackage[],
    minor: OutdatedPackage[],
    major: OutdatedPackage[],
    pm: PackageManager
  ): JobSuggestion[] {
    const suggestions: JobSuggestion[] = [];

    if (patch.length > 0) {
      suggestions.push({
        type: SuggestionType.DEPENDENCY_UPDATE,
        title: `${patch.length} patch update(s) available`,
        description: `Safe patch updates: ${patch.map((p) => `${p.name} ${p.current} → ${p.latest}`).join(", ")}. Run \`${this.getUpdateHint(pm, patch)}\` to apply.`,
        metadata: {
          risk: "patch",
          packages: patch.map((p) => ({
            name: p.name,
            current: p.current,
            latest: p.latest,
          })),
        },
      });
    }

    if (minor.length > 0) {
      suggestions.push({
        type: SuggestionType.DEPENDENCY_UPDATE,
        title: `${minor.length} minor update(s) available`,
        description: `Minor updates: ${minor.map((p) => `${p.name} ${p.current} → ${p.latest}`).join(", ")}. Generally safe but review changelogs.`,
        metadata: {
          risk: "minor",
          packages: minor.map((p) => ({
            name: p.name,
            current: p.current,
            latest: p.latest,
          })),
        },
      });
    }

    if (major.length > 0) {
      suggestions.push({
        type: SuggestionType.DEPENDENCY_UPDATE,
        title: `${major.length} major update(s) require review`,
        description: `Breaking changes possible: ${major.map((p) => `${p.name} ${p.current} → ${p.latest}`).join(", ")}. Review migration guides before upgrading.`,
        metadata: {
          risk: "major",
          packages: major.map((p) => ({
            name: p.name,
            current: p.current,
            latest: p.latest,
          })),
        },
      });
    }

    return suggestions;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private classifyRisk(current: string, latest: string): RiskLevel {
    const currentParts = this.parseSemver(current);
    const latestParts = this.parseSemver(latest);

    if (!currentParts || !latestParts) return "major";

    if (latestParts.major !== currentParts.major) return "major";
    if (latestParts.minor !== currentParts.minor) return "minor";
    return "patch";
  }

  private parseSemver(
    version: string
  ): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  private getUpdateHint(
    pm: PackageManager,
    packages: OutdatedPackage[]
  ): string {
    const specs = packages.map((p) => `${p.name}@${p.latest}`).join(" ");
    switch (pm) {
      case "bun":
        return `bun add ${specs}`;
      case "npm":
        return `npm install ${specs}`;
      case "pnpm":
        return `pnpm add ${specs}`;
      case "yarn":
        return `yarn add ${specs}`;
    }
  }

  private exec(
    bin: string,
    args: string[],
    cwd: string
  ): CommandOutput {
    try {
      const stdout = execFileSync(bin, args, {
        cwd,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000,
      });
      return { stdout, stderr: "", exitCode: 0 };
    } catch (err: unknown) {
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
