import { beforeEach, describe, expect, it } from "bun:test";
import {
  type AutonomyRule,
  ChangeCategory,
  JobSeverity,
  JobType,
  RiskLevel,
  SuggestionType,
} from "@locusai/shared";
import type { JobContext } from "../base-job.js";
import { LintScanJob } from "../scans/lint-scan.js";

// ── Mock child_process ─────────────────────────────────────────────────

// We need to mock execFileSync before importing. Bun doesn't have jest.mock
// hoisting, so we test the public `run()` method via the class and spy on
// the internal helpers by subclassing.

// Helper to build a context
function makeContext(overrides: Partial<JobContext> = {}): JobContext {
  return {
    workspaceId: "ws-1",
    projectPath: "/tmp/project",
    config: {
      type: JobType.LINT_SCAN,
      schedule: { cronExpression: "0 2 * * *", enabled: true },
      severity: JobSeverity.AUTO_EXECUTE,
      enabled: true,
      options: {},
    },
    autonomyRules: [],
    client: {} as any,
    ...overrides,
  };
}

const STYLE_AUTOEXEC_RULES: AutonomyRule[] = [
  {
    category: ChangeCategory.STYLE,
    riskLevel: RiskLevel.LOW,
    autoExecute: true,
  },
];

const STYLE_MANUAL_RULES: AutonomyRule[] = [
  {
    category: ChangeCategory.STYLE,
    riskLevel: RiskLevel.HIGH,
    autoExecute: false,
  },
];

// ── Testable subclass ──────────────────────────────────────────────────
// Since the LintScanJob has private methods that call execFileSync and
// existsSync, we create a testable subclass that overrides the detection
// and execution internals to avoid actual file system / process calls.

class TestableLintScan extends LintScanJob {
  private _linterKind: "biome" | "eslint" | null = "biome";
  private _lintOutput = { stdout: "", stderr: "", exitCode: 0 };
  private _fixOutput = { stdout: "", stderr: "", exitCode: 0 };
  private _fixCalled = false;

  setLinter(kind: "biome" | "eslint" | null) {
    this._linterKind = kind;
  }

  setLintOutput(stdout: string, stderr = "", exitCode = 1) {
    this._lintOutput = { stdout, stderr, exitCode };
  }

  setFixOutput(stdout: string, stderr = "", exitCode = 0) {
    this._fixOutput = { stdout, stderr, exitCode };
  }

  get fixCalled(): boolean {
    return this._fixCalled;
  }

  // Override private methods by casting through prototype
  // We use the public run() which calls these internally.
  // For testing we need to intercept the lower-level calls.
  // Instead, we override `run()` in a way that patches the internals.

  async run(context: JobContext) {
    // Patch internals for this run
    const orig = this as any;
    const origDetect = orig.detectLinter;
    const origRunLinter = orig.runLinter;
    const origAutoFix = orig.autoFix;

    orig.detectLinter = () => {
      if (!this._linterKind) return null;
      return {
        kind: this._linterKind,
        checkCommand:
          this._linterKind === "biome"
            ? ["bunx", "biome", "check", "."]
            : ["npx", "eslint", "."],
        fixCommand:
          this._linterKind === "biome"
            ? ["bunx", "biome", "check", "--fix", "."]
            : ["npx", "eslint", "--fix", "."],
      };
    };

    let callCount = 0;
    orig.runLinter = (_cmd: string[], _path: string) => {
      callCount++;
      // First call is check, second is fix
      if (callCount === 1) return this._lintOutput;
      this._fixCalled = true;
      return this._fixOutput;
    };

    // Stub git operations to avoid real git calls
    orig.gitExec = () => "";
    orig.commitAndPush = () => null;

    try {
      return await LintScanJob.prototype.run.call(this, context);
    } finally {
      orig.detectLinter = origDetect;
      orig.runLinter = origRunLinter;
      orig.autoFix = origAutoFix;
    }
  }
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("LintScanJob", () => {
  let job: TestableLintScan;

  beforeEach(() => {
    job = new TestableLintScan();
  });

  it("has the correct type and name", () => {
    expect(job.type).toBe(JobType.LINT_SCAN);
    expect(job.name).toBe("Linting Scan");
  });

  describe("no linter detected", () => {
    it("returns empty result when no linter is found", async () => {
      job.setLinter(null);
      const result = await job.run(makeContext());

      expect(result.summary).toBe("No linter configuration detected");
      expect(result.suggestions).toHaveLength(0);
      expect(result.filesChanged).toBe(0);
    });
  });

  describe("biome detection", () => {
    it("returns clean result when no issues found", async () => {
      job.setLinter("biome");
      job.setLintOutput("Checked 42 files. No issues found.", "", 0);

      const result = await job.run(makeContext());

      expect(result.summary).toContain("no issues found");
      expect(result.summary).toContain("biome");
      expect(result.suggestions).toHaveLength(0);
    });

    it("parses biome error output correctly", async () => {
      job.setLinter("biome");
      job.setLintOutput("Found 5 errors.", "", 1);

      const result = await job.run(
        makeContext({ autonomyRules: STYLE_MANUAL_RULES })
      );

      expect(result.summary).toContain("5 error(s)");
      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(result.suggestions[0].type).toBe(SuggestionType.CODE_FIX);
      expect(result.suggestions[0].title).toContain("5 lint error(s)");
    });

    it("parses biome warning output correctly", async () => {
      job.setLinter("biome");
      job.setLintOutput("Found 3 warnings.", "", 1);

      const result = await job.run(
        makeContext({ autonomyRules: STYLE_MANUAL_RULES })
      );

      expect(result.summary).toContain("3 warning(s)");
      expect(result.suggestions.some((s) => s.title.includes("warning"))).toBe(
        true
      );
    });

    it("parses biome output with both errors and warnings", async () => {
      job.setLinter("biome");
      job.setLintOutput("Found 2 errors.\nFound 7 warnings.", "", 1);

      const result = await job.run(
        makeContext({ autonomyRules: STYLE_MANUAL_RULES })
      );

      expect(result.summary).toContain("2 error(s)");
      expect(result.summary).toContain("7 warning(s)");
      expect(result.suggestions).toHaveLength(2);
    });
  });

  describe("eslint detection", () => {
    it("parses eslint summary output correctly", async () => {
      job.setLinter("eslint");
      job.setLintOutput("10 problems (4 errors, 6 warnings)", "", 1);

      const result = await job.run(
        makeContext({ autonomyRules: STYLE_MANUAL_RULES })
      );

      expect(result.summary).toContain("4 error(s)");
      expect(result.summary).toContain("6 warning(s)");
      expect(result.suggestions).toHaveLength(2);
    });
  });

  describe("check-only mode (no auto-execute)", () => {
    it("returns suggestions without auto-fixing when autonomy disallows", async () => {
      job.setLinter("biome");
      job.setLintOutput("Found 3 errors.", "", 1);

      const result = await job.run(
        makeContext({ autonomyRules: STYLE_MANUAL_RULES })
      );

      expect(result.filesChanged).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(job.fixCalled).toBe(false);
    });

    it("returns suggestions without auto-fixing when no rules match", async () => {
      job.setLinter("biome");
      job.setLintOutput("Found 3 errors.", "", 1);

      const result = await job.run(makeContext({ autonomyRules: [] }));

      expect(result.filesChanged).toBe(0);
      expect(job.fixCalled).toBe(false);
    });
  });

  describe("auto-fix mode", () => {
    it("calls fix command when autonomy allows auto-execute for STYLE", async () => {
      job.setLinter("biome");
      job.setLintOutput("Found 2 errors.", "", 1);

      await job.run(makeContext({ autonomyRules: STYLE_AUTOEXEC_RULES }));

      expect(job.fixCalled).toBe(true);
    });
  });

  describe("suggestion metadata", () => {
    it("includes linter kind in suggestion metadata", async () => {
      job.setLinter("eslint");
      job.setLintOutput("3 problems (3 errors, 0 warnings)", "", 1);

      const result = await job.run(
        makeContext({ autonomyRules: STYLE_MANUAL_RULES })
      );

      expect(result.suggestions[0].metadata).toEqual(
        expect.objectContaining({ linter: "eslint" })
      );
    });

    it("includes error count in metadata for error suggestions", async () => {
      job.setLinter("biome");
      job.setLintOutput("Found 8 errors.", "", 1);

      const result = await job.run(
        makeContext({ autonomyRules: STYLE_MANUAL_RULES })
      );

      const errorSuggestion = result.suggestions.find((s) =>
        s.title.includes("error")
      );
      expect(errorSuggestion?.metadata).toEqual(
        expect.objectContaining({ errors: 8 })
      );
    });
  });
});
