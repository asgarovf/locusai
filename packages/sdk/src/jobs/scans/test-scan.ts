import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { JobType, SuggestionType } from "@locusai/shared";
import type { JobContext, JobResult, JobSuggestion } from "../base-job.js";
import { BaseJob } from "../base-job.js";

// ============================================================================
// Types
// ============================================================================

type TestRunner = "jest" | "vitest" | "mocha" | "fallback";

interface DetectedTestRunner {
  kind: TestRunner;
  command: string[];
}

interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface TestCaseResult {
  testFile: string;
  testName: string;
  status: "passed" | "failed" | "skipped";
  failureMessages: string[];
}

interface TestRunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  tests: TestCaseResult[];
}

interface TestRunRecord {
  runIndex: number;
  results: Map<string, TestCaseResult>;
}

// ============================================================================
// Test Scan Job
// ============================================================================

export class TestScanJob extends BaseJob {
  readonly type = JobType.FLAKY_TEST_DETECTION;
  readonly name = "Flaky Test Detection";

  async run(context: JobContext): Promise<JobResult> {
    const { projectPath } = context;
    const retryCount =
      (context.config.options?.retryCount as number | undefined) ?? 2;

    // 1. Detect test runner
    const runner = this.detectTestRunner(projectPath);
    if (!runner) {
      return {
        summary: "No test runner detected — skipping flaky test detection",
        suggestions: [],
        filesChanged: 0,
      };
    }

    // 2. Run test suite once
    let firstRun: TestRunSummary;
    try {
      firstRun = this.runTests(runner, projectPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        summary: `Test scan failed: ${message}`,
        suggestions: [],
        filesChanged: 0,
        errors: [message],
      };
    }

    // No tests found
    if (firstRun.total === 0) {
      return {
        summary: "No tests found in project",
        suggestions: [],
        filesChanged: 0,
      };
    }

    // All tests pass — no need to re-run
    if (firstRun.failed === 0) {
      return {
        summary: `All ${firstRun.total} test(s) passed (${runner.kind}) — no flaky tests detected`,
        suggestions: [],
        filesChanged: 0,
      };
    }

    // 3. Re-run to distinguish flaky from broken
    const allRuns: TestRunRecord[] = [
      { runIndex: 0, results: this.indexByKey(firstRun.tests) },
    ];

    for (let i = 1; i <= retryCount; i++) {
      try {
        const rerun = this.runTests(runner, projectPath);
        allRuns.push({ runIndex: i, results: this.indexByKey(rerun.tests) });
      } catch {
        // Re-run failed entirely — skip this run
      }
    }

    // 4. Classify tests
    const { flaky, broken } = this.classifyTests(allRuns, firstRun.tests);

    // 5. Build suggestions
    const suggestions: JobSuggestion[] = [];

    for (const test of flaky) {
      suggestions.push({
        type: SuggestionType.TEST_FIX,
        title: `Flaky test: ${test.testName}`,
        description: [
          `**File:** \`${test.testFile}\``,
          `**Test:** ${test.testName}`,
          `**Pass rate:** ${test.passRate}/${allRuns.length} runs`,
          `**Failure messages:**`,
          ...test.failureMessages.map((m) => `> ${m}`),
        ].join("\n"),
        metadata: {
          testFile: test.testFile,
          testName: test.testName,
          passRate: `${test.passRate}/${allRuns.length}`,
          failureMessages: test.failureMessages,
          category: "flaky",
        },
      });
    }

    for (const test of broken) {
      suggestions.push({
        type: SuggestionType.TEST_FIX,
        title: `Broken test: ${test.testName}`,
        description: [
          `**File:** \`${test.testFile}\``,
          `**Test:** ${test.testName}`,
          `**Status:** Failed in all ${allRuns.length} run(s)`,
          `**Failure messages:**`,
          ...test.failureMessages.map((m) => `> ${m}`),
        ].join("\n"),
        metadata: {
          testFile: test.testFile,
          testName: test.testName,
          passRate: `0/${allRuns.length}`,
          failureMessages: test.failureMessages,
          category: "broken",
        },
      });
    }

    // 6. Build summary
    const summary = [
      `Test health (${runner.kind}):`,
      `${firstRun.total} total,`,
      `${firstRun.passed} passing,`,
      `${firstRun.failed} failing,`,
      `${flaky.length} flaky,`,
      `${broken.length} broken`,
    ].join(" ");

    return {
      summary,
      suggestions,
      filesChanged: 0,
    };
  }

  // ==========================================================================
  // Test Runner Detection
  // ==========================================================================

  private detectTestRunner(projectPath: string): DetectedTestRunner | null {
    // Check for Jest config files
    try {
      const files = readdirSync(projectPath);
      if (files.some((f) => f.startsWith("jest.config."))) {
        return {
          kind: "jest",
          command: ["npx", "jest", "--json", "--no-coverage"],
        };
      }
    } catch {
      // Directory read failed
    }

    // Check for Vitest config files
    try {
      const files = readdirSync(projectPath);
      if (files.some((f) => f.startsWith("vitest.config."))) {
        return {
          kind: "vitest",
          command: ["npx", "vitest", "run", "--reporter=json"],
        };
      }
    } catch {
      // Directory read failed
    }

    // Check package.json for jest/mocha references
    const pkgJsonPath = join(projectPath, "package.json");
    if (existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));

        // Check for jest in package.json (config or dependency)
        if (
          pkgJson.jest ||
          pkgJson.devDependencies?.jest ||
          pkgJson.dependencies?.jest
        ) {
          return {
            kind: "jest",
            command: ["npx", "jest", "--json", "--no-coverage"],
          };
        }

        // Check for vitest as dependency
        if (pkgJson.devDependencies?.vitest || pkgJson.dependencies?.vitest) {
          return {
            kind: "vitest",
            command: ["npx", "vitest", "run", "--reporter=json"],
          };
        }

        // Check for mocha
        if (pkgJson.devDependencies?.mocha || pkgJson.dependencies?.mocha) {
          return {
            kind: "mocha",
            command: ["npx", "mocha", "--reporter=json"],
          };
        }

        // Check if there's a test script defined
        if (
          pkgJson.scripts?.test &&
          pkgJson.scripts.test !== 'echo "Error: no test specified" && exit 1'
        ) {
          return {
            kind: "fallback",
            command: ["npm", "test", "--", "--no-coverage"],
          };
        }
      } catch {
        // JSON parse failed
      }
    }

    // Check for bun test (bunfig.toml or bun.lock)
    if (
      existsSync(join(projectPath, "bun.lock")) ||
      existsSync(join(projectPath, "bunfig.toml"))
    ) {
      return { kind: "fallback", command: ["bun", "test"] };
    }

    return null;
  }

  // ==========================================================================
  // Test Execution
  // ==========================================================================

  private runTests(
    runner: DetectedTestRunner,
    projectPath: string
  ): TestRunSummary {
    const output = this.exec(runner.command, projectPath);

    switch (runner.kind) {
      case "jest":
        return this.parseJestOutput(output);
      case "vitest":
        return this.parseVitestOutput(output);
      case "mocha":
        return this.parseMochaOutput(output);
      default:
        return this.parseFallbackOutput(output);
    }
  }

  // ==========================================================================
  // Output Parsing — Jest
  // ==========================================================================

  private parseJestOutput(output: CommandOutput): TestRunSummary {
    const combined = `${output.stdout}\n${output.stderr}`;
    const tests: TestCaseResult[] = [];
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Jest --json outputs a JSON blob (possibly mixed with other stderr)
    const jsonData = this.extractJson(combined);
    if (jsonData) {
      total = jsonData.numTotalTests ?? 0;
      passed = jsonData.numPassedTests ?? 0;
      failed = jsonData.numFailedTests ?? 0;
      skipped = jsonData.numPendingTests ?? 0;

      const testResults = jsonData.testResults ?? [];
      for (const suite of testResults) {
        const filePath = suite.testFilePath ?? suite.name ?? "unknown";
        const assertionResults =
          suite.assertionResults ?? suite.testResults ?? [];
        for (const test of assertionResults) {
          const ancestors = Array.isArray(test.ancestorTitles)
            ? test.ancestorTitles.join(" > ")
            : "";
          const testName = ancestors
            ? `${ancestors} > ${test.title ?? test.fullName ?? "unknown"}`
            : (test.title ?? test.fullName ?? "unknown");

          tests.push({
            testFile: filePath,
            testName,
            status:
              test.status === "passed"
                ? "passed"
                : test.status === "pending"
                  ? "skipped"
                  : "failed",
            failureMessages: Array.isArray(test.failureMessages)
              ? test.failureMessages.map(String)
              : [],
          });
        }
      }
    }

    return { total, passed, failed, skipped, tests };
  }

  // ==========================================================================
  // Output Parsing — Vitest
  // ==========================================================================

  private parseVitestOutput(output: CommandOutput): TestRunSummary {
    // Vitest --reporter=json outputs Jest-compatible JSON
    return this.parseJestOutput(output);
  }

  // ==========================================================================
  // Output Parsing — Mocha
  // ==========================================================================

  private parseMochaOutput(output: CommandOutput): TestRunSummary {
    const combined = `${output.stdout}\n${output.stderr}`;
    const tests: TestCaseResult[] = [];
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    const jsonData = this.extractJson(combined);
    if (jsonData?.stats) {
      total = jsonData.stats.tests ?? 0;
      passed = jsonData.stats.passes ?? 0;
      failed = jsonData.stats.failures ?? 0;
      skipped = jsonData.stats.pending ?? 0;

      // Parse passes
      if (Array.isArray(jsonData.passes)) {
        for (const t of jsonData.passes) {
          tests.push({
            testFile: t.file ?? "unknown",
            testName: t.fullTitle ?? t.title ?? "unknown",
            status: "passed",
            failureMessages: [],
          });
        }
      }

      // Parse failures
      if (Array.isArray(jsonData.failures)) {
        for (const t of jsonData.failures) {
          tests.push({
            testFile: t.file ?? "unknown",
            testName: t.fullTitle ?? t.title ?? "unknown",
            status: "failed",
            failureMessages: t.err?.message ? [t.err.message] : [],
          });
        }
      }

      // Parse pending
      if (Array.isArray(jsonData.pending)) {
        for (const t of jsonData.pending) {
          tests.push({
            testFile: t.file ?? "unknown",
            testName: t.fullTitle ?? t.title ?? "unknown",
            status: "skipped",
            failureMessages: [],
          });
        }
      }
    }

    return { total, passed, failed, skipped, tests };
  }

  // ==========================================================================
  // Output Parsing — Fallback
  // ==========================================================================

  private parseFallbackOutput(output: CommandOutput): TestRunSummary {
    // Best-effort parsing of unstructured test output
    const combined = `${output.stdout}\n${output.stderr}`;
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Try common summary patterns
    // Jest text: "Tests: X failed, Y passed, Z total"
    const jestSummary = combined.match(
      /Tests:\s*(?:(\d+)\s+failed,\s*)?(?:(\d+)\s+skipped,\s*)?(?:(\d+)\s+passed,\s*)?(\d+)\s+total/i
    );
    if (jestSummary) {
      failed = parseInt(jestSummary[1] ?? "0", 10);
      skipped = parseInt(jestSummary[2] ?? "0", 10);
      passed = parseInt(jestSummary[3] ?? "0", 10);
      total = parseInt(jestSummary[4], 10);
    }

    // Vitest/Bun text: "X passed | Y failed | Z total"
    if (total === 0) {
      const vitestSummary = combined.match(
        /(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+total/i
      );
      if (vitestSummary) {
        passed = parseInt(vitestSummary[1], 10);
        failed = parseInt(vitestSummary[2], 10);
        total = parseInt(vitestSummary[3], 10);
      }
    }

    // Generic: count "pass" and "fail" lines
    if (total === 0) {
      const lines = combined.split("\n");
      for (const line of lines) {
        if (/\bpass(ed|ing)?\b/i.test(line)) passed++;
        if (/\bfail(ed|ing|ure)?\b/i.test(line)) failed++;
        if (/\bskip(ped)?\b/i.test(line)) skipped++;
      }
      total = passed + failed + skipped;
    }

    return { total, passed, failed, skipped, tests: [] };
  }

  // ==========================================================================
  // Test Classification
  // ==========================================================================

  private classifyTests(
    allRuns: TestRunRecord[],
    _firstRunTests: TestCaseResult[]
  ): {
    flaky: ClassifiedTest[];
    broken: ClassifiedTest[];
  } {
    const flaky: ClassifiedTest[] = [];
    const broken: ClassifiedTest[] = [];

    // Only analyze tests that failed at least once
    const failedKeys = new Set<string>();
    for (const run of allRuns) {
      for (const [key, result] of run.results) {
        if (result.status === "failed") {
          failedKeys.add(key);
        }
      }
    }

    for (const key of failedKeys) {
      let passCount = 0;
      let failCount = 0;
      const failureMessages: string[] = [];
      let testFile = "unknown";
      let testName = key;

      for (const run of allRuns) {
        const result = run.results.get(key);
        if (!result) continue;

        testFile = result.testFile;
        testName = result.testName;

        if (result.status === "passed") {
          passCount++;
        } else if (result.status === "failed") {
          failCount++;
          for (const msg of result.failureMessages) {
            if (msg && !failureMessages.includes(msg)) {
              failureMessages.push(msg);
            }
          }
        }
      }

      // Truncate long failure messages
      const truncatedMessages = failureMessages.map((m) =>
        m.length > 500 ? `${m.slice(0, 500)}...` : m
      );

      if (passCount > 0 && failCount > 0) {
        // Inconsistent — flaky
        flaky.push({
          testFile,
          testName,
          passRate: passCount,
          failureMessages: truncatedMessages,
        });
      } else if (failCount > 0 && passCount === 0) {
        // Always fails — broken
        broken.push({
          testFile,
          testName,
          passRate: 0,
          failureMessages: truncatedMessages,
        });
      }
    }

    return { flaky, broken };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private testKey(test: TestCaseResult): string {
    return `${test.testFile}::${test.testName}`;
  }

  private indexByKey(tests: TestCaseResult[]): Map<string, TestCaseResult> {
    const map = new Map<string, TestCaseResult>();
    for (const test of tests) {
      map.set(this.testKey(test), test);
    }
    return map;
  }

  // biome-ignore lint/suspicious/noExplicitAny: parsing arbitrary JSON output
  private extractJson(text: string): Record<string, any> | null {
    // Try to find and parse a JSON object in the output
    // Jest sometimes prepends non-JSON text before the JSON blob
    const firstBrace = text.indexOf("{");
    if (firstBrace === -1) return null;

    // Find matching closing brace
    let depth = 0;
    let lastBrace = -1;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          lastBrace = i;
          break;
        }
      }
    }

    if (lastBrace === -1) return null;

    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  private exec(command: string[], projectPath: string): CommandOutput {
    const [bin, ...args] = command;
    try {
      const stdout = execFileSync(bin, args, {
        cwd: projectPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 300_000, // 5 minutes — tests can be slow
      });
      return { stdout, stderr: "", exitCode: 0 };
    } catch (err: unknown) {
      // Test runners exit with non-zero when tests fail — that's expected
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
}

// ============================================================================
// Internal Types
// ============================================================================

interface ClassifiedTest {
  testFile: string;
  testName: string;
  passRate: number;
  failureMessages: string[];
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
