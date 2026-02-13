import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * TaskTreeProvider tests.
 *
 * The TaskTreeProvider depends on vscode.TreeDataProvider and
 * vscode.TreeItem which require the VS Code Extension Host.
 * These tests verify the module structure and source correctness.
 */
describe("TaskTreeProvider", () => {
  it("source file exists", () => {
    const providerPath = join(
      import.meta.dir,
      "..",
      "providers",
      "task-provider.ts"
    );
    expect(existsSync(providerPath)).toBe(true);
  });

  it("exports expected classes", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(import.meta.dir, "..", "providers", "task-provider.ts"),
      "utf-8"
    );

    // Verify key exports
    expect(source).toContain("export class TaskTreeProvider");
    expect(source).toContain("export class TaskGroupItem");
    expect(source).toContain("export class TaskItem");
    expect(source).toContain("export type TaskTreeItem");
  });

  it("implements TreeDataProvider interface methods", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(import.meta.dir, "..", "providers", "task-provider.ts"),
      "utf-8"
    );

    expect(source).toContain("getTreeItem(");
    expect(source).toContain("getChildren(");
    expect(source).toContain("onDidChangeTreeData");
    expect(source).toContain("refresh()");
  });

  it("defines status ordering for task groups", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(import.meta.dir, "..", "providers", "task-provider.ts"),
      "utf-8"
    );

    // Verify status groups are handled
    expect(source).toContain("IN_PROGRESS");
    expect(source).toContain("BACKLOG");
    expect(source).toContain("IN_REVIEW");
    expect(source).toContain("BLOCKED");
    expect(source).toContain("DONE");
  });

  it("task view is registered in package.json", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf-8")
    );

    const views = pkg.contributes.views["locus-sidebar"];
    const taskView = views.find(
      (v: { id: string }) => v.id === "locus.taskView"
    );
    expect(taskView).toBeDefined();
    expect(taskView.name).toBe("Tasks");
  });

  it("refresh command is registered in package.json", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf-8")
    );

    const commands = pkg.contributes.commands.map(
      (c: { command: string }) => c.command
    );
    expect(commands).toContain("locus.refreshTasks");
  });

  it("start task command is registered in package.json", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf-8")
    );

    const commands = pkg.contributes.commands.map(
      (c: { command: string }) => c.command
    );
    expect(commands).toContain("locus.startTask");
  });

  it("TaskItem sets correct contextValue for menus", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(import.meta.dir, "..", "providers", "task-provider.ts"),
      "utf-8"
    );

    // TaskItem should set contextValue to "task" for context menus
    expect(source).toContain('this.contextValue = "task"');
    // TaskGroupItem should set contextValue to "taskGroup"
    expect(source).toContain('this.contextValue = "taskGroup"');
  });

  it("has view/item/context menu contribution", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf-8")
    );

    const menus = pkg.contributes.menus;
    expect(menus["view/title"]).toBeDefined();
    expect(menus["view/item/context"]).toBeDefined();

    // Refresh should appear in task view title
    const titleMenu = menus["view/title"].find(
      (m: { command: string }) => m.command === "locus.refreshTasks"
    );
    expect(titleMenu).toBeDefined();
    expect(titleMenu.when).toBe("view == locus.taskView");
  });
});
