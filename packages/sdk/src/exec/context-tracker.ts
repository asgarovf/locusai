/**
 * Artifact types that can be tracked across conversation turns.
 */
export type ArtifactType =
  | "plan"
  | "document"
  | "code"
  | "task-list"
  | "diagram"
  | "config"
  | "report"
  | "other";

/**
 * Represents an artifact created during the session.
 */
export interface Artifact {
  /** Unique identifier for the artifact */
  id: string;
  /** Human-readable title of the artifact */
  title: string;
  /** Type of artifact */
  type: ArtifactType;
  /** Content of the artifact (can be markdown, code, etc.) */
  content: string;
  /** Timestamp when the artifact was created */
  createdAt: number;
  /** Timestamp when the artifact was last updated */
  updatedAt: number;
  /** Optional file path if artifact was saved to disk */
  filePath?: string;
  /** Optional metadata for additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Task status for tracking progress.
 */
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

/**
 * Represents a task created during the session.
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Human-readable title of the task */
  title: string;
  /** Detailed description of the task */
  description?: string;
  /** Current status of the task */
  status: TaskStatus;
  /** Timestamp when the task was created */
  createdAt: number;
  /** Timestamp when the task was last updated */
  updatedAt: number;
  /** Optional parent task ID for hierarchical tasks */
  parentId?: string;
  /** Optional metadata for additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Common keyword aliases for reference resolution.
 */
const REFERENCE_ALIASES: Record<string, string[]> = {
  plan: ["the plan", "sprint plan", "project plan", "implementation plan"],
  document: ["the doc", "that doc", "the document", "that document"],
  code: ["the code", "that code", "the implementation"],
  "task-list": ["the tasks", "the task list", "todo list", "todos"],
  diagram: ["the diagram", "that diagram", "the chart"],
  config: ["the config", "configuration", "settings"],
  report: ["the report", "that report"],
};

/**
 * Generates a unique artifact ID.
 */
function generateArtifactId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `artifact-${timestamp}-${random}`;
}

/**
 * Generates a unique task ID.
 */
function generateTaskId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `task-${timestamp}-${random}`;
}

/**
 * Serialized state of the ContextTracker for persistence.
 */
export interface ContextTrackerState {
  artifacts: Artifact[];
  tasks: Task[];
}

/**
 * Tracks artifacts and tasks created during an AI session to enable
 * context-aware follow-up conversations and reference resolution.
 *
 * The ContextTracker enables multi-turn workflow support by:
 * - Maintaining a registry of artifacts (plans, docs, code) created in the session
 * - Tracking tasks and their status
 * - Resolving natural language references ("the plan", "that doc")
 * - Building context summaries for prompts
 *
 * @example
 * ```typescript
 * const tracker = new ContextTracker();
 *
 * // Track an artifact
 * const artifact = tracker.createArtifact({
 *   title: "Sprint Plan Q1",
 *   type: "plan",
 *   content: "## Week 1\n..."
 * });
 *
 * // Later, resolve a reference
 * const plan = tracker.getReferencedArtifact("the plan");
 *
 * // Build context for next prompt
 * const context = tracker.buildContextSummary();
 * ```
 */
export class ContextTracker {
  private artifacts: Map<string, Artifact> = new Map();
  private tasks: Map<string, Task> = new Map();

  /**
   * Create a new artifact and track it.
   */
  createArtifact(
    params: Omit<Artifact, "id" | "createdAt" | "updatedAt">
  ): Artifact {
    const now = Date.now();
    const artifact: Artifact = {
      ...params,
      id: generateArtifactId(),
      createdAt: now,
      updatedAt: now,
    };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  /**
   * Track an existing artifact.
   */
  trackArtifact(artifact: Artifact): void {
    this.artifacts.set(artifact.id, artifact);
  }

  /**
   * Update an existing artifact.
   */
  updateArtifact(
    id: string,
    updates: Partial<Omit<Artifact, "id" | "createdAt">>
  ): Artifact | null {
    const artifact = this.artifacts.get(id);
    if (!artifact) {
      return null;
    }

    const updated: Artifact = {
      ...artifact,
      ...updates,
      updatedAt: Date.now(),
    };
    this.artifacts.set(id, updated);
    return updated;
  }

  /**
   * Get an artifact by ID.
   */
  getArtifact(id: string): Artifact | null {
    return this.artifacts.get(id) ?? null;
  }

  /**
   * Get all tracked artifacts.
   */
  getAllArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values());
  }

  /**
   * Create a new task and track it.
   */
  createTask(params: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
    const now = Date.now();
    const task: Task = {
      ...params,
      id: generateTaskId(),
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Track an existing task.
   */
  trackTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Update an existing task.
   */
  updateTask(
    id: string,
    updates: Partial<Omit<Task, "id" | "createdAt">>
  ): Task | null {
    const task = this.tasks.get(id);
    if (!task) {
      return null;
    }

    const updated: Task = {
      ...task,
      ...updates,
      updatedAt: Date.now(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  /**
   * Get a task by ID.
   */
  getTask(id: string): Task | null {
    return this.tasks.get(id) ?? null;
  }

  /**
   * Get all tracked tasks.
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status.
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === status);
  }

  /**
   * Resolve a natural language reference to an artifact.
   *
   * Supports multiple resolution strategies:
   * 1. Exact ID match
   * 2. Title contains reference (case-insensitive)
   * 3. Type-based reference using aliases ("the plan", "that doc")
   * 4. Keyword matching in title
   *
   * @param reference - Natural language reference like "the plan" or "sprint doc"
   * @returns The matched artifact or null if no match found
   */
  getReferencedArtifact(reference: string): Artifact | null {
    const normalizedRef = reference.toLowerCase().trim();

    // 1. Try exact ID match
    const byId = this.artifacts.get(reference);
    if (byId) {
      return byId;
    }

    // 2. Try title match (contains)
    for (const artifact of this.artifacts.values()) {
      if (artifact.title.toLowerCase().includes(normalizedRef)) {
        return artifact;
      }
    }

    // 3. Try alias-based type matching
    for (const [type, aliases] of Object.entries(REFERENCE_ALIASES)) {
      if (aliases.some((alias) => normalizedRef.includes(alias))) {
        // Find most recent artifact of this type
        const ofType = Array.from(this.artifacts.values())
          .filter((a) => a.type === type)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        if (ofType.length > 0) {
          return ofType[0];
        }
      }
    }

    // 4. Try keyword matching in title
    const keywords = normalizedRef.split(/\s+/).filter((w) => w.length > 2);
    for (const artifact of this.artifacts.values()) {
      const titleLower = artifact.title.toLowerCase();
      if (keywords.some((kw) => titleLower.includes(kw))) {
        return artifact;
      }
    }

    return null;
  }

  /**
   * Resolve a natural language reference to a task.
   *
   * @param reference - Natural language reference like "the auth task"
   * @returns The matched task or null if no match found
   */
  getReferencedTask(reference: string): Task | null {
    const normalizedRef = reference.toLowerCase().trim();

    // 1. Try exact ID match
    const byId = this.tasks.get(reference);
    if (byId) {
      return byId;
    }

    // 2. Try title match (contains)
    for (const task of this.tasks.values()) {
      if (task.title.toLowerCase().includes(normalizedRef)) {
        return task;
      }
    }

    // 3. Try keyword matching in title
    const keywords = normalizedRef.split(/\s+/).filter((w) => w.length > 2);
    for (const task of this.tasks.values()) {
      const titleLower = task.title.toLowerCase();
      if (keywords.some((kw) => titleLower.includes(kw))) {
        return task;
      }
    }

    return null;
  }

  /**
   * Build a context summary for inclusion in prompts.
   * Provides the AI with awareness of artifacts and tasks from the session.
   */
  buildContextSummary(): string {
    const artifacts = Array.from(this.artifacts.values());
    const tasks = Array.from(this.tasks.values());

    if (artifacts.length === 0 && tasks.length === 0) {
      return "";
    }

    const sections: string[] = [];
    sections.push("## Active Context");

    if (artifacts.length > 0) {
      sections.push("");
      sections.push("### Artifacts Created");
      for (const artifact of artifacts) {
        const filePath = artifact.filePath ? ` [${artifact.filePath}]` : "";
        sections.push(`- ${artifact.title} (${artifact.type})${filePath}`);
      }
    }

    if (tasks.length > 0) {
      sections.push("");
      sections.push("### Tasks");
      const byStatus: Record<TaskStatus, Task[]> = {
        pending: [],
        in_progress: [],
        completed: [],
        cancelled: [],
      };

      for (const task of tasks) {
        byStatus[task.status].push(task);
      }

      // Show in-progress first, then pending, then completed
      const statusOrder: TaskStatus[] = [
        "in_progress",
        "pending",
        "completed",
        "cancelled",
      ];
      for (const status of statusOrder) {
        const statusTasks = byStatus[status];
        if (statusTasks.length > 0) {
          for (const task of statusTasks) {
            const icon = this.getStatusIcon(task.status);
            sections.push(`- ${icon} ${task.title}`);
          }
        }
      }
    }

    return sections.join("\n");
  }

  /**
   * Get a status icon for display.
   */
  private getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case "pending":
        return "○";
      case "in_progress":
        return "◐";
      case "completed":
        return "●";
      case "cancelled":
        return "✕";
    }
  }

  /**
   * Check if the tracker has any content.
   */
  hasContent(): boolean {
    return this.artifacts.size > 0 || this.tasks.size > 0;
  }

  /**
   * Clear all tracked artifacts and tasks.
   */
  clear(): void {
    this.artifacts.clear();
    this.tasks.clear();
  }

  /**
   * Serialize the tracker state for persistence.
   */
  toJSON(): ContextTrackerState {
    return {
      artifacts: Array.from(this.artifacts.values()),
      tasks: Array.from(this.tasks.values()),
    };
  }

  /**
   * Restore tracker state from serialized data.
   */
  static fromJSON(state: ContextTrackerState): ContextTracker {
    const tracker = new ContextTracker();
    for (const artifact of state.artifacts) {
      tracker.artifacts.set(artifact.id, artifact);
    }
    for (const task of state.tasks) {
      tracker.tasks.set(task.id, task);
    }
    return tracker;
  }

  /**
   * Restore state into this tracker instance.
   */
  restore(state: ContextTrackerState): void {
    this.clear();
    for (const artifact of state.artifacts) {
      this.artifacts.set(artifact.id, artifact);
    }
    for (const task of state.tasks) {
      this.tasks.set(task.id, task);
    }
  }
}
