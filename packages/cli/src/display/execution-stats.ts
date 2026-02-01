/**
 * Tracks execution statistics during AI prompt execution.
 *
 * Collects data about timing, tool usage, and token consumption
 * for display in the execution summary.
 */
export interface ExecutionStats {
  /** Total execution time in milliseconds */
  duration: number;
  /** Names of tools used during execution */
  toolsUsed: string[];
  /** Detailed timing for each tool invocation */
  toolTimings: ToolTiming[];
  /** Number of tokens used (if available) */
  tokensUsed?: number;
  /** Whether execution completed successfully */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
}

/**
 * Records timing information for a single tool invocation.
 */
export interface ToolTiming {
  /** Tool name (e.g., "Read", "Write", "Bash") */
  name: string;
  /** Tool invocation ID */
  id?: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp (undefined if still running) */
  endTime?: number;
  /** Duration in milliseconds (undefined if still running) */
  duration?: number;
  /** Whether the tool completed successfully */
  success?: boolean;
  /** Error message if the tool failed */
  error?: string;
}

/**
 * Tracks execution statistics in real-time during prompt execution.
 */
export class ExecutionStatsTracker {
  private startTime: number;
  private endTime: number | null = null;
  private toolTimings: Map<string, ToolTiming> = new Map();
  private toolOrder: string[] = [];
  private tokensUsed: number | null = null;
  private error: string | null = null;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Record that a tool has started execution.
   */
  toolStarted(toolName: string, toolId?: string): void {
    const key = toolId ?? `${toolName}-${Date.now()}`;
    this.toolTimings.set(key, {
      name: toolName,
      id: toolId,
      startTime: Date.now(),
    });
    this.toolOrder.push(key);
  }

  /**
   * Record that a tool has completed successfully.
   */
  toolCompleted(toolName: string, toolId?: string): void {
    const key = this.findToolKey(toolName, toolId);
    if (key) {
      const timing = this.toolTimings.get(key);
      if (timing) {
        timing.endTime = Date.now();
        timing.duration = timing.endTime - timing.startTime;
        timing.success = true;
      }
    }
  }

  /**
   * Record that a tool has failed.
   */
  toolFailed(toolName: string, error: string, toolId?: string): void {
    const key = this.findToolKey(toolName, toolId);
    if (key) {
      const timing = this.toolTimings.get(key);
      if (timing) {
        timing.endTime = Date.now();
        timing.duration = timing.endTime - timing.startTime;
        timing.success = false;
        timing.error = error;
      }
    }
  }

  /**
   * Set the total tokens used.
   */
  setTokensUsed(tokens: number): void {
    this.tokensUsed = tokens;
  }

  /**
   * Record an execution error.
   */
  setError(error: string): void {
    this.error = error;
  }

  /**
   * Mark execution as complete and return final stats.
   */
  finalize(): ExecutionStats {
    this.endTime = Date.now();

    // Build unique list of tool names used (in order of first use)
    const toolsUsed: string[] = [];
    const seenTools = new Set<string>();
    for (const key of this.toolOrder) {
      const timing = this.toolTimings.get(key);
      if (timing && !seenTools.has(timing.name)) {
        seenTools.add(timing.name);
        toolsUsed.push(timing.name);
      }
    }

    // Get all tool timings
    const toolTimings = this.toolOrder
      .map((key) => this.toolTimings.get(key))
      .filter((t): t is ToolTiming => t !== undefined);

    const stats: ExecutionStats = {
      duration: this.endTime - this.startTime,
      toolsUsed,
      toolTimings,
      success: this.error === null,
    };

    if (this.tokensUsed !== null) {
      stats.tokensUsed = this.tokensUsed;
    }

    if (this.error !== null) {
      stats.error = this.error;
    }

    return stats;
  }

  /**
   * Get current duration (for live updates).
   */
  getCurrentDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Find the key for a tool timing entry.
   */
  private findToolKey(toolName: string, toolId?: string): string | null {
    // If toolId provided, look for exact match
    if (toolId && this.toolTimings.has(toolId)) {
      return toolId;
    }

    // Otherwise find the most recent unfinished tool with matching name
    for (let i = this.toolOrder.length - 1; i >= 0; i--) {
      const key = this.toolOrder[i];
      const timing = this.toolTimings.get(key);
      if (timing && timing.name === toolName && timing.endTime === undefined) {
        return key;
      }
    }

    // Fall back to most recent tool with matching name
    for (let i = this.toolOrder.length - 1; i >= 0; i--) {
      const key = this.toolOrder[i];
      const timing = this.toolTimings.get(key);
      if (timing && timing.name === toolName) {
        return key;
      }
    }

    return null;
  }
}
