import * as vscode from "vscode";
import { type ApiTask, LocusApiClient } from "../services/api-client";
import { getWorkspacePath } from "../utils/workspace";

const STATUS_ORDER: Record<string, number> = {
  IN_PROGRESS: 0,
  BACKLOG: 1,
  IN_REVIEW: 2,
  BLOCKED: 3,
  DONE: 4,
};

const STATUS_ICONS: Record<string, string> = {
  IN_PROGRESS: "$(play)",
  BACKLOG: "$(circle-outline)",
  IN_REVIEW: "$(eye)",
  BLOCKED: "$(error)",
  DONE: "$(check)",
};

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "In Progress",
  BACKLOG: "Backlog",
  IN_REVIEW: "In Review",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export type TaskTreeItem = TaskGroupItem | TaskItem;

export class TaskGroupItem extends vscode.TreeItem {
  constructor(
    public readonly status: string,
    public readonly taskCount: number
  ) {
    super(
      `${STATUS_LABELS[status] || status} (${taskCount})`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    this.contextValue = "taskGroup";
    this.iconPath = new vscode.ThemeIcon(
      STATUS_ICONS[status]?.replace("$(", "").replace(")", "") ||
        "circle-outline"
    );
  }
}

export class TaskItem extends vscode.TreeItem {
  constructor(public readonly task: ApiTask) {
    super(task.title, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "task";
    this.tooltip = task.description || task.title;
    this.description = task.priority || "";

    const iconName = this.getIconName(task.status);
    this.iconPath = new vscode.ThemeIcon(iconName);

    this.command = {
      command: "locus.viewTask",
      title: "View Task",
      arguments: [task],
    };
  }

  private getIconName(status: string): string {
    switch (status) {
      case "IN_PROGRESS":
        return "play";
      case "BACKLOG":
        return "circle-outline";
      case "IN_REVIEW":
        return "eye";
      case "BLOCKED":
        return "error";
      case "DONE":
        return "check";
      default:
        return "circle-outline";
    }
  }
}

/**
 * TreeDataProvider for displaying workspace tasks in the sidebar.
 */
export class TaskTreeProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TaskTreeItem | undefined | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tasks: ApiTask[] = [];
  private loading = false;
  private lastError: string | null = null;

  refresh(): void {
    this.loadTasks();
  }

  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TaskTreeItem): TaskTreeItem[] {
    if (!element) {
      // Root level: group by status
      if (this.loading) {
        return [new vscode.TreeItem("Loading tasks...") as TaskTreeItem];
      }

      if (this.lastError) {
        return [new vscode.TreeItem(this.lastError) as TaskTreeItem];
      }

      if (this.tasks.length === 0) {
        return [new vscode.TreeItem("No tasks found") as TaskTreeItem];
      }

      const groups = this.groupByStatus();
      const sortedStatuses = Object.keys(groups).sort(
        (a, b) => (STATUS_ORDER[a] ?? 99) - (STATUS_ORDER[b] ?? 99)
      );

      return sortedStatuses.map(
        (status) => new TaskGroupItem(status, groups[status].length)
      );
    }

    if (element instanceof TaskGroupItem) {
      const groups = this.groupByStatus();
      const tasks = groups[element.status] || [];
      return tasks.map((t) => new TaskItem(t));
    }

    return [];
  }

  private groupByStatus(): Record<string, ApiTask[]> {
    const groups: Record<string, ApiTask[]> = {};
    for (const task of this.tasks) {
      const status = task.status || "BACKLOG";
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(task);
    }
    return groups;
  }

  private async loadTasks(): Promise<void> {
    const projectPath = getWorkspacePath();
    if (!projectPath) {
      this.lastError = "No workspace folder open";
      this._onDidChangeTreeData.fire(undefined);
      return;
    }

    this.loading = true;
    this.lastError = null;
    this._onDidChangeTreeData.fire(undefined);

    try {
      const client = new LocusApiClient(projectPath);

      if (!client.isConfigured()) {
        this.lastError = "API key not configured. Run 'Locus: Setup Project'.";
        this.loading = false;
        this._onDidChangeTreeData.fire(undefined);
        return;
      }

      if (!client.hasWorkspace()) {
        this.lastError = "No workspace selected. Run 'Locus: Setup Project'.";
        this.loading = false;
        this._onDidChangeTreeData.fire(undefined);
        return;
      }

      this.tasks = await client.listTasks();
      this.lastError = null;
    } catch (err) {
      this.lastError = `Failed to load tasks: ${err instanceof Error ? err.message : String(err)}`;
      this.tasks = [];
    }

    this.loading = false;
    this._onDidChangeTreeData.fire(undefined);
  }
}
