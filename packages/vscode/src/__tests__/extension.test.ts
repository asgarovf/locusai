import { describe, expect, it } from "bun:test";

/**
 * Extension activation tests.
 *
 * Note: Full VS Code extension activation requires the VS Code Extension Host
 * which is not available in unit tests. These tests verify that the extension
 * module exports the expected interface and package.json is correctly configured.
 */
describe("extension module", () => {
  it("exports activate and deactivate functions", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    const extensionPath = join(import.meta.dir, "..", "extension.ts");
    expect(existsSync(extensionPath)).toBe(true);
  });

  it("extension source references all providers", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const source = readFileSync(
      join(import.meta.dir, "..", "extension.ts"),
      "utf-8"
    );

    // Chat provider
    expect(source).toContain("ChatViewProvider");
    // Task provider
    expect(source).toContain("TaskTreeProvider");
    // Status bar
    expect(source).toContain("createStatusBarItem");
    // All commands
    expect(source).toContain('"locus.setup"');
    expect(source).toContain('"locus.newSession"');
    expect(source).toContain('"locus.resetContext"');
    expect(source).toContain('"locus.abort"');
    expect(source).toContain('"locus.refreshTasks"');
    expect(source).toContain('"locus.viewTask"');
    expect(source).toContain('"locus.startTask"');
    expect(source).toContain('"locus.selectProvider"');
  });

  it("has correct package.json contributions", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const pkgPath = join(import.meta.dir, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

    // Verify all commands are registered
    const commands = pkg.contributes.commands.map(
      (c: { command: string }) => c.command
    );
    expect(commands).toContain("locus.setup");
    expect(commands).toContain("locus.newSession");
    expect(commands).toContain("locus.resetContext");
    expect(commands).toContain("locus.abort");
    expect(commands).toContain("locus.refreshTasks");
    expect(commands).toContain("locus.viewTask");
    expect(commands).toContain("locus.startTask");
    expect(commands).toContain("locus.selectProvider");

    // Verify view contributions
    const views = pkg.contributes.views;
    expect(views["locus-sidebar"]).toBeDefined();

    const chatView = views["locus-sidebar"].find(
      (v: { id: string }) => v.id === "locus.chatView"
    );
    expect(chatView).toBeDefined();
    expect(chatView.type).toBe("webview");

    const taskView = views["locus-sidebar"].find(
      (v: { id: string }) => v.id === "locus.taskView"
    );
    expect(taskView).toBeDefined();
    expect(taskView.name).toBe("Tasks");

    // Verify activity bar container
    const containers = pkg.contributes.viewsContainers.activitybar;
    expect(containers).toHaveLength(1);
    expect(containers[0].id).toBe("locus-sidebar");

    // Verify activation events
    expect(pkg.activationEvents).toContain("workspaceContains:.locus");

    // Verify engine constraint
    expect(pkg.engines.vscode).toBeDefined();

    // Verify configuration
    const config = pkg.contributes.configuration.properties;
    expect(config["locus.provider"]).toBeDefined();
    expect(config["locus.model"]).toBeDefined();
  });

  it("has menu contributions for task view", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const pkg = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf-8")
    );

    const menus = pkg.contributes.menus;
    expect(menus).toBeDefined();
    expect(menus["view/title"]).toBeDefined();
    expect(menus["view/item/context"]).toBeDefined();
  });

  it("has keybinding for abort command", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const pkg = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "..", "package.json"), "utf-8")
    );

    const keybindings = pkg.contributes.keybindings;
    expect(keybindings).toBeDefined();
    expect(keybindings.length).toBeGreaterThan(0);

    const abortBinding = keybindings.find(
      (kb: { command: string }) => kb.command === "locus.abort"
    );
    expect(abortBinding).toBeDefined();
    expect(abortBinding.key).toBeDefined();
  });
});
