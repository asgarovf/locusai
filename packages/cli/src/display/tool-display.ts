import * as path from "node:path";
import type {
  BashToolParams,
  EditToolParams,
  GlobResultData,
  GlobToolParams,
  GrepResultData,
  GrepToolParams,
  ReadToolParams,
  TaskToolParams,
  ToolParams,
  ToolResultData,
  WebFetchToolParams,
  WriteToolParams,
} from "@locusai/sdk/node";
import { c } from "@locusai/sdk/node";

/**
 * Tool execution data for display formatting.
 */
export interface ToolExecution {
  name: string;
  id?: string;
  parameters?: ToolParams;
  startTime?: number;
}

/**
 * Tool result data for display formatting.
 */
export interface ToolResult {
  success: boolean;
  duration?: number;
  error?: string;
  data?: ToolResultData;
}

/**
 * Formats and displays tool execution details with meaningful context.
 *
 * Shows what tools are doing, not just that they're running:
 * - File paths for Read/Write/Edit
 * - Commands with descriptions for Bash
 * - Search patterns for Grep/Glob
 * - URLs for WebFetch
 * - Result summaries (matches found, files changed, etc.)
 */
export class ToolDisplay {
  /**
   * Format tool execution start message.
   */
  formatToolStart(tool: ToolExecution): string[] {
    const lines: string[] = [];

    switch (tool.name) {
      case "Read":
        lines.push(...this.formatReadTool(tool));
        break;
      case "Write":
        lines.push(...this.formatWriteTool(tool));
        break;
      case "Edit":
        lines.push(...this.formatEditTool(tool));
        break;
      case "Bash":
        lines.push(...this.formatBashTool(tool));
        break;
      case "Grep":
        lines.push(...this.formatGrepTool(tool));
        break;
      case "Glob":
        lines.push(...this.formatGlobTool(tool));
        break;
      case "WebFetch":
        lines.push(...this.formatWebFetchTool(tool));
        break;
      case "Task":
        lines.push(...this.formatTaskTool(tool));
        break;
      default:
        lines.push(...this.formatGenericTool(tool));
    }

    return lines;
  }

  /**
   * Format tool completion message.
   */
  formatToolResult(tool: ToolExecution, result: ToolResult): string[] {
    const lines: string[] = [];

    if (result.success) {
      const durationStr = result.duration ? ` (${result.duration}ms)` : "";
      lines.push(c.green(`   ✓ Completed${durationStr}`));

      // Add result-specific details
      const resultDetails = this.formatResultDetails(tool.name, result.data);
      if (resultDetails) {
        lines.push(c.dim(`   ${resultDetails}`));
      }
    } else {
      const errorMsg = result.error
        ? this.truncate(result.error, 60)
        : "Unknown error";
      lines.push(c.red(`   ✗ Failed: ${errorMsg}`));
    }

    return lines;
  }

  private formatReadTool(tool: ToolExecution): string[] {
    const params = tool.parameters as ReadToolParams | undefined;
    const lines: string[] = [];

    if (params?.file_path) {
      const fileName = path.basename(params.file_path);
      const dirPath = this.formatPath(params.file_path);
      lines.push(c.cyan(`📖 Reading ${c.bold(fileName)}`));
      lines.push(c.dim(`   ${dirPath}`));

      if (params.offset !== undefined || params.limit !== undefined) {
        const rangeInfo: string[] = [];
        if (params.offset !== undefined)
          rangeInfo.push(`offset: ${params.offset}`);
        if (params.limit !== undefined)
          rangeInfo.push(`limit: ${params.limit}`);
        lines.push(c.dim(`   (${rangeInfo.join(", ")})`));
      }
    } else {
      lines.push(c.cyan("📖 Reading file"));
    }

    return lines;
  }

  private formatWriteTool(tool: ToolExecution): string[] {
    const params = tool.parameters as WriteToolParams | undefined;
    const lines: string[] = [];

    if (params?.file_path) {
      const fileName = path.basename(params.file_path);
      const dirPath = this.formatPath(params.file_path);
      const size = params.content?.length ?? 0;
      lines.push(c.cyan(`✍️  Writing ${c.bold(fileName)}`));
      lines.push(c.dim(`   ${dirPath} (${this.formatBytes(size)})`));
    } else {
      lines.push(c.cyan("✍️  Writing file"));
    }

    return lines;
  }

  private formatEditTool(tool: ToolExecution): string[] {
    const params = tool.parameters as EditToolParams | undefined;
    const lines: string[] = [];

    if (params?.file_path) {
      const fileName = path.basename(params.file_path);
      const dirPath = this.formatPath(params.file_path);
      lines.push(c.cyan(`✏️  Editing ${c.bold(fileName)}`));
      lines.push(c.dim(`   ${dirPath}`));

      if (params.replace_all) {
        lines.push(c.dim("   (replace all occurrences)"));
      }
    } else {
      lines.push(c.cyan("✏️  Editing file"));
    }

    return lines;
  }

  private formatBashTool(tool: ToolExecution): string[] {
    const params = tool.parameters as BashToolParams | undefined;
    const lines: string[] = [];

    if (params) {
      const description = params.description || "Running command";
      lines.push(c.cyan(`⚡ ${description}`));

      if (params.command) {
        const truncatedCmd = this.truncate(params.command, 80);
        lines.push(c.dim(`   $ ${truncatedCmd}`));
      }

      if (params.timeout) {
        lines.push(c.dim(`   (timeout: ${params.timeout}ms)`));
      }
    } else {
      lines.push(c.cyan("⚡ Running command"));
    }

    return lines;
  }

  private formatGrepTool(tool: ToolExecution): string[] {
    const params = tool.parameters as GrepToolParams | undefined;
    const lines: string[] = [];

    if (params?.pattern) {
      const truncatedPattern = this.truncate(params.pattern, 40);
      lines.push(c.cyan(`🔍 Searching for "${truncatedPattern}"`));

      const searchScope: string[] = [];
      if (params.path) searchScope.push(`in ${this.formatPath(params.path)}`);
      if (params.glob) searchScope.push(`matching ${params.glob}`);
      if (params.type) searchScope.push(`type: ${params.type}`);

      if (searchScope.length > 0) {
        lines.push(c.dim(`   ${searchScope.join(", ")}`));
      }

      if (params.output_mode && params.output_mode !== "files_with_matches") {
        lines.push(c.dim(`   (mode: ${params.output_mode})`));
      }
    } else {
      lines.push(c.cyan("🔍 Searching code"));
    }

    return lines;
  }

  private formatGlobTool(tool: ToolExecution): string[] {
    const params = tool.parameters as GlobToolParams | undefined;
    const lines: string[] = [];

    if (params?.pattern) {
      lines.push(c.cyan(`📁 Finding files matching "${params.pattern}"`));
      if (params.path) {
        lines.push(c.dim(`   in ${this.formatPath(params.path)}`));
      }
    } else {
      lines.push(c.cyan("📁 Finding files"));
    }

    return lines;
  }

  private formatWebFetchTool(tool: ToolExecution): string[] {
    const params = tool.parameters as WebFetchToolParams | undefined;
    const lines: string[] = [];

    if (params?.url) {
      const truncatedUrl = this.truncate(params.url, 60);
      lines.push(c.cyan(`🌐 Fetching ${truncatedUrl}`));
      if (params.prompt) {
        const truncatedPrompt = this.truncate(params.prompt, 50);
        lines.push(c.dim(`   "${truncatedPrompt}"`));
      }
    } else {
      lines.push(c.cyan("🌐 Fetching URL"));
    }

    return lines;
  }

  private formatTaskTool(tool: ToolExecution): string[] {
    const params = tool.parameters as TaskToolParams | undefined;
    const lines: string[] = [];

    if (params) {
      const desc = params.description || "Running task";
      lines.push(c.cyan(`🤖 ${desc}`));
      if (params.subagent_type) {
        lines.push(c.dim(`   agent: ${params.subagent_type}`));
      }
    } else {
      lines.push(c.cyan("🤖 Spawning agent"));
    }

    return lines;
  }

  private formatGenericTool(tool: ToolExecution): string[] {
    return [c.cyan(`🔧 Using ${tool.name}`)];
  }

  private formatResultDetails(
    toolName: string,
    data?: ToolResultData
  ): string | null {
    if (!data) return null;

    switch (toolName) {
      case "Grep": {
        const grepData = data as GrepResultData;
        if (grepData.matches !== undefined) {
          return `Found ${grepData.matches} ${grepData.matches === 1 ? "match" : "matches"}`;
        }
        if (grepData.files?.length !== undefined) {
          return `Found in ${grepData.files.length} ${grepData.files.length === 1 ? "file" : "files"}`;
        }
        break;
      }
      case "Glob": {
        const globData = data as GlobResultData;
        const count = globData.count ?? globData.files?.length;
        if (count !== undefined) {
          return `Found ${count} ${count === 1 ? "file" : "files"}`;
        }
        break;
      }
    }

    return null;
  }

  /**
   * Format a file path for display, shortening if necessary.
   */
  private formatPath(filePath: string): string {
    // Remove common prefixes to shorten paths
    const cwd = process.cwd();
    if (filePath.startsWith(cwd)) {
      return filePath.slice(cwd.length + 1) || filePath;
    }

    // Shorten home directory
    const home = process.env.HOME;
    if (home && filePath.startsWith(home)) {
      return `~${filePath.slice(home.length)}`;
    }

    return filePath;
  }

  /**
   * Format bytes into human-readable size.
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Truncate a string to a maximum length.
   */
  private truncate(text: string, maxLength: number): string {
    // Remove newlines and normalize whitespace
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.substring(0, maxLength - 3)}...`;
  }
}
