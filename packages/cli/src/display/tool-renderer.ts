/**
 * Compact tool card renderer.
 * Displays tool invocations from the AI agent as concise cards
 * with inline diffs for Edit and output previews for Bash.
 */

import { renderCompactDiff } from "./diff-renderer.js";
import { cyan, dim, green, red, truncate, yellow } from "./terminal.js";

export interface ToolEvent {
  tool: string;
  params: Record<string, unknown>;
  duration?: number;
  result?: string;
  diff?: string;
}

/**
 * Render a tool invocation as a compact card.
 * Returns an array of formatted lines.
 */
export function renderToolCard(event: ToolEvent): string[] {
  const { tool, params, duration, result, diff } = event;
  const durationStr = duration ? dim(` ${duration}ms`) : "";
  const lines: string[] = [];

  switch (tool) {
    case "Read": {
      const path = String(params.file_path ?? "");
      const lineCount = params.limit ? ` (${params.limit} lines)` : "";
      const offset = params.offset ? ` from line ${params.offset}` : "";
      lines.push(
        `  ${toolIcon("Read")} ${dim(shortPath(path))}${dim(lineCount)}${dim(offset)}${durationStr}`
      );
      break;
    }

    case "Write": {
      const path = String(params.file_path ?? "");
      lines.push(
        `  ${toolIcon("Write")} ${dim(shortPath(path))} ${green("new file")}${durationStr}`
      );
      break;
    }

    case "Edit": {
      const path = String(params.file_path ?? "");
      lines.push(`  ${toolIcon("Edit")} ${dim(shortPath(path))}${durationStr}`);
      // Inline diff if available
      if (diff) {
        const diffLines = renderCompactDiff(diff, 8);
        for (const dl of diffLines) {
          lines.push(`    ${dl}`);
        }
      } else if (params.old_string && params.new_string) {
        // Synthesize a mini diff from params
        const oldStr = String(params.old_string);
        const newStr = String(params.new_string);
        const oldLines = oldStr.split("\n").slice(0, 4);
        const newLines = newStr.split("\n").slice(0, 4);
        for (const ol of oldLines) {
          lines.push(`    ${red(`- ${ol}`)}`);
        }
        for (const nl of newLines) {
          lines.push(`    ${green(`+ ${nl}`)}`);
        }
        if (oldStr.split("\n").length > 4 || newStr.split("\n").length > 4) {
          lines.push(`    ${dim("... more changes")}`);
        }
      }
      break;
    }

    case "Bash": {
      const command = truncateCommand(String(params.command ?? ""));
      const exitCode = result?.includes("exit code")
        ? result.match(/exit code (\d+)/)?.[1]
        : undefined;
      const exitBadge =
        exitCode && exitCode !== "0" ? ` ${red(`exit ${exitCode}`)}` : "";
      lines.push(
        `  ${toolIcon("Bash")} ${dim("$")} ${command}${exitBadge}${durationStr}`
      );
      // Output preview (max 5 lines, head + tail with ellipsis)
      if (result) {
        const outputLines = result.split("\n").filter(Boolean);
        if (outputLines.length <= 5) {
          for (const ol of outputLines) {
            lines.push(`    ${dim(ol.slice(0, 100))}`);
          }
        } else {
          for (const ol of outputLines.slice(0, 3)) {
            lines.push(`    ${dim(ol.slice(0, 100))}`);
          }
          lines.push(`    ${dim(`... ${outputLines.length - 4} more lines`)}`);
          lines.push(
            `    ${dim(outputLines[outputLines.length - 1].slice(0, 100))}`
          );
        }
      }
      break;
    }

    case "Grep": {
      const pattern = String(params.pattern ?? "");
      const scope = params.path
        ? dim(` in ${shortPath(String(params.path))}`)
        : "";
      lines.push(
        `  ${toolIcon("Grep")} ${cyan(`/${pattern}/`)}${scope}${durationStr}`
      );
      break;
    }

    case "Glob": {
      const pattern = String(params.pattern ?? "");
      lines.push(`  ${toolIcon("Glob")} ${dim(pattern)}${durationStr}`);
      break;
    }

    case "WebFetch": {
      const url = truncate(String(params.url ?? ""), 60);
      lines.push(`  ${toolIcon("WebFetch")} ${dim(url)}${durationStr}`);
      break;
    }

    case "Task": {
      const desc = String(params.description ?? "subtask");
      const agentType = params.subagent_type
        ? dim(` (${params.subagent_type})`)
        : "";
      lines.push(`  ${toolIcon("Task")} ${desc}${agentType}${durationStr}`);
      break;
    }

    default: {
      lines.push(
        `  ${toolIcon(tool)} ${dim(JSON.stringify(params).slice(0, 80))}${durationStr}`
      );
    }
  }

  return lines;
}

/**
 * Render a batch of tool events.
 */
export function renderToolBatch(events: ToolEvent[]): string[] {
  const lines: string[] = [];
  for (const event of events) {
    lines.push(...renderToolCard(event));
  }
  return lines;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toolIcon(tool: string): string {
  const icons: Record<string, string> = {
    Read: cyan("○"),
    Write: green("●"),
    Edit: yellow("●"),
    Bash: dim("$"),
    Grep: cyan("⌕"),
    Glob: dim("⊕"),
    WebFetch: dim("↗"),
    Task: dim("⊞"),
    TodoWrite: dim("☐"),
    NotebookEdit: dim("⊡"),
  };
  return icons[tool] ?? dim("•");
}

function shortPath(path: string): string {
  // Shorten absolute paths to relative
  const cwd = process.cwd();
  if (path.startsWith(cwd)) {
    return path.slice(cwd.length + 1);
  }
  // Show last 3 segments of long paths
  const segments = path.split("/");
  if (segments.length > 4) {
    return `…/${segments.slice(-3).join("/")}`;
  }
  return path;
}

function truncateCommand(cmd: string): string {
  // Show first line only, truncated
  const firstLine = cmd.split("\n")[0];
  if (firstLine.length > 80) {
    return `${firstLine.slice(0, 77)}…`;
  }
  return firstLine;
}
