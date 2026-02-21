import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { JobType, SuggestionType } from "@locusai/shared";
import { BaseJob } from "../base-job.js";
import type { JobContext, JobResult, JobSuggestion } from "../base-job.js";

// ============================================================================
// Types
// ============================================================================

type TodoType = "TODO" | "FIXME" | "HACK" | "XXX";

interface TodoItem {
  file: string;
  line: number;
  type: TodoType;
  text: string;
}

interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ============================================================================
// TODO Scan Job
// ============================================================================

export class TodoScanJob extends BaseJob {
  readonly type = JobType.TODO_CLEANUP;
  readonly name = "TODO Cleanup";

  async run(context: JobContext): Promise<JobResult> {
    const { projectPath } = context;

    // 1. Scan for TODO/FIXME/HACK/XXX comments
    let output: CommandOutput;
    try {
      output = this.scanForTodos(projectPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        summary: `TODO scan failed: ${message}`,
        suggestions: [],
        filesChanged: 0,
        errors: [message],
      };
    }

    // 2. Parse results into structured items
    const items = this.parseGrepOutput(output.stdout, projectPath);

    // No TODOs found
    if (items.length === 0) {
      return {
        summary: "TODO scan passed — no TODO/FIXME/HACK/XXX comments found",
        suggestions: [],
        filesChanged: 0,
      };
    }

    // 3. Categorize by type
    const grouped = this.groupByType(items);

    // 4. Build suggestions (one per item)
    const suggestions = this.buildSuggestions(items);

    // 5. Build summary
    const summary = this.buildSummary(grouped, items, context);

    return {
      summary,
      suggestions,
      filesChanged: 0,
    };
  }

  // ==========================================================================
  // Scanning
  // ==========================================================================

  private scanForTodos(projectPath: string): CommandOutput {
    const args = [
      "-rn",
      "--include=*.ts",
      "--include=*.tsx",
      "--include=*.js",
      "--include=*.jsx",
      "--exclude-dir=node_modules",
      "--exclude-dir=.git",
      "--exclude-dir=dist",
      "--exclude-dir=build",
      "--exclude-dir=.locus",
      "-E",
      "(TODO|FIXME|HACK|XXX):?",
      projectPath,
    ];

    return this.exec("grep", args, projectPath);
  }

  // ==========================================================================
  // Parsing
  // ==========================================================================

  private parseGrepOutput(stdout: string, projectPath: string): TodoItem[] {
    const items: TodoItem[] = [];
    const lines = stdout.split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      // grep -rn output format: file:line:content
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (!match) continue;

      const [, filePath, lineNum, content] = match;

      // Extract the TODO type from the content
      const typeMatch = content.match(/\b(TODO|FIXME|HACK|XXX):?\s*(.*)/);
      if (!typeMatch) continue;

      const todoType = typeMatch[1] as TodoType;
      const text = typeMatch[2].trim() || content.trim();

      // Use relative path for cleaner output
      const relFile = relative(projectPath, filePath);

      items.push({
        file: relFile,
        line: parseInt(lineNum, 10),
        type: todoType,
        text,
      });
    }

    return items;
  }

  // ==========================================================================
  // Grouping
  // ==========================================================================

  private groupByType(items: TodoItem[]): Record<TodoType, TodoItem[]> {
    const grouped: Record<TodoType, TodoItem[]> = {
      TODO: [],
      FIXME: [],
      HACK: [],
      XXX: [],
    };

    for (const item of items) {
      grouped[item.type].push(item);
    }

    return grouped;
  }

  // ==========================================================================
  // Suggestion Building
  // ==========================================================================

  private buildSuggestions(items: TodoItem[]): JobSuggestion[] {
    return items.map((item) => ({
      type: SuggestionType.CODE_FIX,
      title: `${item.type} in ${item.file}:${item.line}`,
      description: `${item.type} comment found: ${item.text}`,
      metadata: {
        file: item.file,
        line: item.line,
        todoType: item.type,
        text: item.text,
      },
    }));
  }

  // ==========================================================================
  // Summary
  // ==========================================================================

  private buildSummary(
    grouped: Record<TodoType, TodoItem[]>,
    items: TodoItem[],
    context: JobContext
  ): string {
    // Count unique files
    const uniqueFiles = new Set(items.map((i) => i.file)).size;

    // Build type counts
    const counts: string[] = [];
    if (grouped.TODO.length > 0) counts.push(`${grouped.TODO.length} TODOs`);
    if (grouped.FIXME.length > 0)
      counts.push(`${grouped.FIXME.length} FIXMEs`);
    if (grouped.HACK.length > 0) counts.push(`${grouped.HACK.length} HACKs`);
    if (grouped.XXX.length > 0) counts.push(`${grouped.XXX.length} XXXs`);

    let summary = `Found ${counts.join(", ")} across ${uniqueFiles} file(s)`;

    // Compare with previous run if available
    const previousCount = context.config.options?.previousTodoCount;
    if (typeof previousCount === "number") {
      const diff = previousCount - items.length;
      if (diff > 0) {
        summary += ` (${diff} resolved since last run)`;
      } else if (diff < 0) {
        summary += ` (${Math.abs(diff)} new since last run)`;
      }
    }

    return summary;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private exec(bin: string, args: string[], cwd: string): CommandOutput {
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
        // grep exits with code 1 when no matches found — that's expected
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
