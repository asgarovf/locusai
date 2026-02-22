import {
  c,
  type StreamChunk,
  type ToolParams,
  type ToolResultData,
} from "@locusai/sdk/node";
import type { ExecutionStats } from "./execution-stats";
import { ToolDisplay, type ToolExecution } from "./tool-display";

/**
 * Tool icons for visual identification.
 */
const TOOL_ICONS: Record<string, string> = {
  Read: "📖",
  Write: "✍️",
  Edit: "✏️",
  Bash: "⚡",
  Grep: "🔍",
  Glob: "📁",
  WebFetch: "🌐",
  Task: "🤖",
  Search: "🔎",
  List: "📋",
};

/**
 * Human-readable tool messages.
 */
const TOOL_MESSAGES: Record<string, string> = {
  Read: "Reading file",
  Write: "Writing file",
  Edit: "Editing file",
  Bash: "Running command",
  Grep: "Searching code",
  Glob: "Finding files",
  WebFetch: "Fetching URL",
  Task: "Spawning agent",
  Search: "Searching",
  List: "Listing",
};

/**
 * ANSI escape codes for cursor control.
 */
const ANSI = {
  SHOW_CURSOR: "\u001b[?25h",
  CLEAR_LINE: "\u001b[2K",
  MOVE_TO_START: "\u001b[0G",
};

/**
 * Spinner frames using braille patterns for smooth animation.
 */
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Renders progress indicators during AI execution using continuous output.
 *
 * Features:
 * - Thinking indicator on start
 * - Tool icons and progress messages
 * - Duration tracking for each tool
 * - Execution summary at the end
 *
 * Uses simple console.log for output to prevent terminal conflicts.
 * All output is continuous (append-only, no in-place updates).
 */
export class ProgressRenderer {
  private currentTool: string | null = null;
  private currentToolId: string | null = null;
  private currentToolStartTime: number | null = null;
  private currentToolParams: ToolParams | null = null;
  private currentLine = "";
  private isThinking = false;
  private toolDisplay = new ToolDisplay();
  private toolDisplayShown = false;
  private thinkingShown = false;
  private spinnerInterval: ReturnType<typeof setInterval> | null = null;
  private spinnerFrameIndex = 0;
  private thinkingStartTime: number | null = null;
  private isInTextBlock = false; // Track if we're currently outputting text
  // Buffer to handle completion marker that may span multiple chunks
  private textBuffer = "";

  /**
   * Show thinking indicator with optional animation.
   */
  showThinkingStarted(): void {
    if (this.isThinking) return;

    this.isThinking = true;
    this.thinkingStartTime = Date.now();

    if (!this.thinkingShown) {
      this.thinkingShown = true;
      this.startThinkingAnimation();
    }
  }

  /**
   * Stop thinking indicator.
   */
  showThinkingStopped(): void {
    if (!this.isThinking) return;

    this.isThinking = false;
    this.stopThinkingAnimation();
  }

  /**
   * Start the animated thinking spinner.
   */
  private startThinkingAnimation(): void {
    if (this.spinnerInterval) return;

    this.spinnerFrameIndex = 0;
    this.renderThinkingFrame();

    this.spinnerInterval = setInterval(() => {
      this.spinnerFrameIndex =
        (this.spinnerFrameIndex + 1) % SPINNER_FRAMES.length;
      this.renderThinkingFrame();
    }, 80);
  }

  /**
   * Render a single thinking animation frame.
   */
  private renderThinkingFrame(): void {
    const spinner = SPINNER_FRAMES[this.spinnerFrameIndex];
    const elapsed = this.thinkingStartTime
      ? Math.floor((Date.now() - this.thinkingStartTime) / 1000)
      : 0;
    const elapsedText = elapsed > 0 ? ` (${elapsed}s)` : "";

    // Clear line and write new frame
    process.stdout.write(ANSI.MOVE_TO_START + ANSI.CLEAR_LINE);
    process.stdout.write(c.dim(`${spinner} Thinking...${elapsedText}`));
  }

  /**
   * Stop the thinking animation and clear the line.
   */
  stopThinkingAnimation(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }

    // Clear the thinking line if we were animating
    if (this.thinkingShown && this.isThinking) {
      process.stdout.write(`${ANSI.MOVE_TO_START}${ANSI.CLEAR_LINE}\n`);
    }

    this.isThinking = false;
    this.thinkingStartTime = null;
  }

  /**
   * Show that a tool has started execution.
   */
  showToolStarted(
    toolName: string,
    toolId?: string,
    params?: ToolParams
  ): void {
    // End any text block before showing tool output
    this.endTextBlock();

    // Stop any thinking animation before showing tool
    if (this.isThinking) {
      this.stopThinkingAnimation();
    }

    this.currentTool = toolName;
    this.currentToolId = toolId ?? null;
    this.currentToolStartTime = Date.now();
    this.currentToolParams = params ?? null;
    this.toolDisplayShown = false;

    // If we have parameters, show detailed tool info
    if (params) {
      this.showDetailedToolStart(toolName, toolId, params);
    } else {
      // Show generic tool start message
      const icon = this.getToolIcon(toolName);
      const message = this.getToolMessage(toolName);
      console.log(c.cyan(`${icon} ${message}...`));
    }
  }

  /**
   * Update tool display when parameters become available.
   */
  showToolParameters(
    toolName: string,
    toolId?: string,
    params?: ToolParams
  ): void {
    // Only update if this matches the current tool
    if (this.currentTool !== toolName) return;
    if (toolId && this.currentToolId && toolId !== this.currentToolId) return;

    this.currentToolParams = params ?? null;

    if (params && !this.toolDisplayShown) {
      this.showDetailedToolStart(toolName, toolId, params);
    }
  }

  /**
   * Show detailed tool start with parameters.
   */
  private showDetailedToolStart(
    toolName: string,
    toolId?: string,
    params?: ToolParams
  ): void {
    const tool: ToolExecution = {
      name: toolName,
      id: toolId,
      parameters: params,
      startTime: this.currentToolStartTime ?? Date.now(),
    };

    const lines = this.toolDisplay.formatToolStart(tool);

    if (lines.length > 0) {
      this.toolDisplayShown = true;

      // Print all detail lines
      for (const line of lines) {
        console.log(line);
      }
    }
  }

  /**
   * Show that a tool has completed successfully.
   */
  showToolCompleted(
    toolName: string,
    duration?: number,
    toolId?: string,
    resultData?: ToolResultData
  ): void {
    // Only process if this matches the current tool
    if (this.currentTool !== toolName) return;
    if (toolId && this.currentToolId && toolId !== this.currentToolId) return;

    const actualDuration =
      duration ??
      (this.currentToolStartTime ? Date.now() - this.currentToolStartTime : 0);

    if (this.toolDisplayShown) {
      // Show result using ToolDisplay for consistency
      const tool: ToolExecution = {
        name: toolName,
        id: toolId,
        parameters: this.currentToolParams ?? undefined,
      };
      const resultLines = this.toolDisplay.formatToolResult(tool, {
        success: true,
        duration: actualDuration,
        data: resultData,
      });
      for (const line of resultLines) {
        console.log(line);
      }
    } else {
      // Fallback to simple output
      const icon = this.getToolIcon(toolName);
      const message = this.getToolMessage(toolName);
      console.log(
        c.green(`${icon} ${message}`) + c.dim(` (${actualDuration}ms) ✓`)
      );
    }

    this.currentTool = null;
    this.currentToolId = null;
    this.currentToolStartTime = null;
    this.currentToolParams = null;
    this.toolDisplayShown = false;
  }

  /**
   * Show that a tool has failed.
   */
  showToolFailed(toolName: string, error: string, toolId?: string): void {
    // Only process if this matches the current tool
    if (this.currentTool !== toolName) return;
    if (toolId && this.currentToolId && toolId !== this.currentToolId) return;

    if (this.toolDisplayShown) {
      // Show result using ToolDisplay for consistency
      const tool: ToolExecution = {
        name: toolName,
        id: toolId,
        parameters: this.currentToolParams ?? undefined,
      };
      const resultLines = this.toolDisplay.formatToolResult(tool, {
        success: false,
        error,
      });
      for (const line of resultLines) {
        console.log(line);
      }
    } else {
      // Fallback to simple output
      const icon = this.getToolIcon(toolName);
      console.log(
        c.red(`${icon} ${toolName} failed: ${this.truncate(error, 60)}`)
      );
    }

    this.currentTool = null;
    this.currentToolId = null;
    this.currentToolStartTime = null;
    this.currentToolParams = null;
    this.toolDisplayShown = false;
  }

  /**
   * Render a text delta (content chunk from AI).
   */
  renderTextDelta(content: string): void {
    // Stop any thinking animation before outputting text
    if (this.isThinking) {
      this.stopThinkingAnimation();
    }

    // Add content to buffer
    this.textBuffer += content;

    // Calculate safe output length
    const safeLength = this.textBuffer.length;

    // Output the safe portion
    const safeContent = this.textBuffer.slice(0, safeLength);
    this.textBuffer = this.textBuffer.slice(safeLength);

    if (!safeContent) return;

    // Add newline before text block starts for visual separation
    if (!this.isInTextBlock) {
      process.stdout.write("\n");
      this.isInTextBlock = true;
    }

    process.stdout.write(safeContent);
    this.currentLine += safeContent;

    if (safeContent.includes("\n")) {
      this.currentLine = safeContent.split("\n").pop() ?? "";
    }
  }

  /**
   * End the current text block, adding a trailing newline for separation.
   */
  endTextBlock(): void {
    if (this.isInTextBlock) {
      process.stdout.write("\n");
      this.isInTextBlock = false;
    }
  }

  /**
   * Render a stream chunk from the AI.
   */
  renderChunk(chunk: StreamChunk): void {
    switch (chunk.type) {
      case "text_delta":
        this.renderTextDelta(chunk.content);
        break;

      case "tool_use":
        this.showToolStarted(chunk.tool, chunk.id, chunk.parameters);
        break;

      case "tool_parameters":
        this.showToolParameters(chunk.tool, chunk.id, chunk.parameters);
        break;

      case "tool_result":
        if (chunk.success) {
          this.showToolCompleted(
            chunk.tool,
            chunk.duration,
            chunk.id,
            chunk.data
          );
        } else {
          this.showToolFailed(
            chunk.tool,
            chunk.error ?? "Unknown error",
            chunk.id
          );
        }
        break;

      case "thinking":
        this.showThinkingStarted();
        break;

      case "result":
        // Final result - usually already shown via text_delta
        break;

      case "error":
        this.renderError(chunk.error);
        break;
    }
  }

  /**
   * Render an error message.
   */
  renderError(error: string): void {
    this.isThinking = false;

    // Ensure we start on a new line
    if (this.currentLine.length > 0) {
      process.stdout.write("\n");
      this.currentLine = "";
    }

    console.log(`\n${c.error("Error:")} ${c.red(error)}`);
  }

  /**
   * Show the execution summary.
   */
  showSummary(stats: ExecutionStats): void {
    const divider = c.dim("─".repeat(50));

    console.log("");
    console.log(divider);
    console.log(c.primary("Execution Summary:"));
    console.log(c.dim(`  Duration: ${this.formatDuration(stats.duration)}`));

    if (stats.toolsUsed.length > 0) {
      const toolsWithIcons = stats.toolsUsed
        .map((t) => `${this.getToolIcon(t)} ${t}`)
        .join(", ");
      console.log(c.dim(`  Tools used: ${toolsWithIcons}`));
    }

    if (stats.tokensUsed !== undefined) {
      console.log(c.dim(`  Tokens: ${stats.tokensUsed.toLocaleString()}`));
    }

    if (!stats.success && stats.error) {
      console.log(c.red(`  Error: ${this.truncate(stats.error, 40)}`));
    }

    console.log(divider);
    console.log("");
  }

  /**
   * Finalize the renderer, ensuring proper line endings.
   */
  finalize(): void {
    this.stopThinkingAnimation();

    // Flush any remaining buffered text (filtering out completion marker)
    if (this.textBuffer) {
      const remaining = this.textBuffer;
      if (remaining) {
        if (!this.isInTextBlock) {
          process.stdout.write("\n");
          this.isInTextBlock = true;
        }
        process.stdout.write(remaining);
        this.currentLine += remaining;
      }
      this.textBuffer = "";
    }

    // End any text block with trailing newline
    this.endTextBlock();

    // Ensure cursor is visible
    process.stdout.write(ANSI.SHOW_CURSOR);

    if (this.currentLine.length > 0) {
      process.stdout.write("\n");
      this.currentLine = "";
    }

    // Reset state for next execution
    this.thinkingShown = false;
    this.isInTextBlock = false;
  }

  /**
   * Get the icon for a tool.
   */
  private getToolIcon(toolName: string): string {
    return TOOL_ICONS[toolName] ?? "🔧";
  }

  /**
   * Get the human-readable message for a tool.
   */
  private getToolMessage(toolName: string): string {
    return TOOL_MESSAGES[toolName] ?? `Using ${toolName}`;
  }

  /**
   * Format duration for display.
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }

  /**
   * Truncate a string to a maximum length.
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength - 3)}...`;
  }
}
