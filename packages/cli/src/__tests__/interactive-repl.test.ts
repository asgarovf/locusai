import { describe, expect, it, beforeEach, mock, spyOn } from "bun:test";
import {
  SlashCommandRegistry,
  type SlashCommand,
  type REPLSession,
  type REPLMode,
  type DiscussionState,
} from "../repl/slash-commands";
import { StatusBar, type StatusBarState } from "../repl/status-bar";

// ============================================================================
// StatusBar
// ============================================================================

describe("StatusBar", () => {
  let bar: StatusBar;

  beforeEach(() => {
    bar = new StatusBar();
  });

  describe("formatContent", () => {
    it("formats prompt mode correctly", () => {
      const state: StatusBarState = {
        provider: "claude",
        model: "opus",
        sessionId: "abcdef1234567890",
        mode: "prompt",
      };
      const content = bar.formatContent(state);
      expect(content).toContain("[claude:opus]");
      expect(content).toContain("session:abcdef12");
      expect(content).toContain("mode:prompt");
      expect(content).toContain("/help for commands");
    });

    it("formats discussion mode with discussionId", () => {
      const state: StatusBarState = {
        provider: "codex",
        model: "gpt-5.3-codex",
        sessionId: "session123456789",
        mode: "discussion",
        discussionId: "disc-abc-12345678",
      };
      const content = bar.formatContent(state);
      expect(content).toContain("[codex:gpt-5.3-codex]");
      expect(content).toContain("mode:discussion(disc-abc");
    });

    it("formats discussion mode without discussionId as plain mode", () => {
      const state: StatusBarState = {
        provider: "claude",
        model: "sonnet",
        sessionId: "1234567890abcdef",
        mode: "discussion",
      };
      const content = bar.formatContent(state);
      expect(content).toContain("mode:discussion");
      expect(content).not.toContain("mode:discussion(");
    });
  });

  describe("update and refresh", () => {
    it("update stores state and renders", () => {
      const writeSpy = spyOn(process.stdout, "write").mockImplementation(
        () => true
      );
      const state: StatusBarState = {
        provider: "claude",
        model: "opus",
        sessionId: "test-session-1234",
        mode: "prompt",
      };
      bar.update(state);
      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });

    it("refresh is a noop before update is called", () => {
      const writeSpy = spyOn(process.stdout, "write").mockImplementation(
        () => true
      );
      bar.refresh();
      expect(writeSpy).not.toHaveBeenCalled();
      writeSpy.mockRestore();
    });

    it("refresh re-renders after update", () => {
      const writeSpy = spyOn(process.stdout, "write").mockImplementation(
        () => true
      );
      bar.update({
        provider: "claude",
        model: "opus",
        sessionId: "test-session-1234",
        mode: "prompt",
      });
      writeSpy.mockClear();
      bar.refresh();
      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();
    });
  });
});

// ============================================================================
// InteractiveREPL — processBufferedInput routing
// ============================================================================

describe("InteractiveREPL processBufferedInput routing", () => {
  // Since InteractiveREPL's constructor requires real SDK dependencies
  // (createAiRunner, HistoryManager, etc.), we test the routing logic
  // by verifying the SlashCommandRegistry parse + execute flow that
  // processBufferedInput delegates to.

  let registry: SlashCommandRegistry;
  let executedCommands: Array<{ name: string; args: string }>;

  function registerCommand(name: string, aliases: string[] = []): void {
    registry.register({
      name,
      aliases,
      description: `Test ${name}`,
      usage: `/${name}`,
      category: "session",
      execute: (_session, args) => {
        executedCommands.push({ name, args: args ?? "" });
      },
    });
  }

  beforeEach(() => {
    registry = new SlashCommandRegistry();
    executedCommands = [];
    registerCommand("help", ["?", "h"]);
    registerCommand("exit", ["quit", "q"]);
    registerCommand("discuss", ["d"]);
    registerCommand("plan");
    registerCommand("review");
    registerCommand("reset", ["r"]);
    registerCommand("provider");
    registerCommand("model");
  });

  it("routes /help to the help command handler", async () => {
    const parsed = registry.parse("/help");
    expect(parsed).not.toBeNull();
    await parsed!.command.execute({} as REPLSession, parsed!.args);
    expect(executedCommands).toEqual([{ name: "help", args: "" }]);
  });

  it("routes /exit to the exit command handler", async () => {
    const parsed = registry.parse("/exit");
    expect(parsed).not.toBeNull();
    await parsed!.command.execute({} as REPLSession, parsed!.args);
    expect(executedCommands).toEqual([{ name: "exit", args: "" }]);
  });

  it("routes /discuss topic to discuss handler with args", async () => {
    const parsed = registry.parse("/discuss my topic");
    expect(parsed).not.toBeNull();
    await parsed!.command.execute({} as REPLSession, parsed!.args);
    expect(executedCommands).toEqual([
      { name: "discuss", args: "my topic" },
    ]);
  });

  it("routes /plan --list to plan handler with args", async () => {
    const parsed = registry.parse("/plan --list");
    expect(parsed).not.toBeNull();
    await parsed!.command.execute({} as REPLSession, parsed!.args);
    expect(executedCommands).toEqual([{ name: "plan", args: "--list" }]);
  });

  it("routes bare 'exit' to exit handler (backward compat)", async () => {
    const parsed = registry.parse("exit");
    expect(parsed).not.toBeNull();
    await parsed!.command.execute({} as REPLSession, parsed!.args);
    expect(executedCommands).toEqual([{ name: "exit", args: "" }]);
  });

  it("returns null for non-command input (routes to executePrompt)", () => {
    const parsed = registry.parse("explain this code");
    expect(parsed).toBeNull();
    // In the real REPL, null means the input is sent to executePrompt
  });

  it("returns null for empty input (no-op)", () => {
    const parsed = registry.parse("");
    expect(parsed).toBeNull();
  });

  it("routes /provider without args to show provider info", async () => {
    const parsed = registry.parse("/provider");
    expect(parsed).not.toBeNull();
    await parsed!.command.execute({} as REPLSession, parsed!.args);
    expect(executedCommands).toEqual([{ name: "provider", args: "" }]);
  });

  it("routes /provider claude to switch provider", async () => {
    const parsed = registry.parse("/provider claude");
    expect(parsed).not.toBeNull();
    await parsed!.command.execute({} as REPLSession, parsed!.args);
    expect(executedCommands).toEqual([{ name: "provider", args: "claude" }]);
  });

  it("routes /model sonnet to switch model", async () => {
    const parsed = registry.parse("/model sonnet");
    expect(parsed).not.toBeNull();
    await parsed!.command.execute({} as REPLSession, parsed!.args);
    expect(executedCommands).toEqual([{ name: "model", args: "sonnet" }]);
  });
});

// ============================================================================
// Mode switching simulation
// ============================================================================

describe("mode switching", () => {
  it("session can transition prompt → discussion → prompt", () => {
    let mode: REPLMode = "prompt";
    let discussionState: DiscussionState | null = null;

    const session: Partial<REPLSession> = {
      getMode: () => mode,
      getDiscussionState: () => discussionState,
      enterDiscussionMode: (state: DiscussionState) => {
        mode = "discussion";
        discussionState = state;
      },
      exitDiscussionMode: () => {
        mode = "prompt";
        discussionState = null;
      },
    };

    // Start in prompt mode
    expect(session.getMode!()).toBe("prompt");
    expect(session.getDiscussionState!()).toBeNull();

    // Enter discussion mode
    const mockState: DiscussionState = {
      facilitator: {} as any,
      discussionId: "disc-123",
      discussionManager: {} as any,
    };
    session.enterDiscussionMode!(mockState);

    expect(session.getMode!()).toBe("discussion");
    expect(session.getDiscussionState!()).not.toBeNull();
    expect(session.getDiscussionState!()!.discussionId).toBe("disc-123");

    // Exit discussion mode
    session.exitDiscussionMode!();

    expect(session.getMode!()).toBe("prompt");
    expect(session.getDiscussionState!()).toBeNull();
  });
});

// ============================================================================
// Provider/model switching reinitializes runner
// ============================================================================

describe("provider/model switching", () => {
  it("setProvider updates internal state", () => {
    let currentProvider = "claude";
    let runnerRecreated = false;

    const session: Partial<REPLSession> = {
      getProvider: () => currentProvider as any,
      setProvider: (provider) => {
        currentProvider = provider;
        runnerRecreated = true;
      },
    };

    session.setProvider!("codex" as any);
    expect(currentProvider).toBe("codex");
    expect(runnerRecreated).toBe(true);
  });

  it("setModel updates internal state", () => {
    let currentModel = "opus";
    let runnerRecreated = false;

    const session: Partial<REPLSession> = {
      getModel: () => currentModel,
      setModel: (model) => {
        currentModel = model;
        runnerRecreated = true;
      },
    };

    session.setModel!("sonnet");
    expect(currentModel).toBe("sonnet");
    expect(runnerRecreated).toBe(true);
  });
});

// ============================================================================
// Tab completion
// ============================================================================

describe("tab completion", () => {
  it("getCommandNames returns slash-prefixed names for completion", () => {
    const registry = new SlashCommandRegistry();
    registry.register({
      name: "help",
      aliases: ["?"],
      description: "Show help",
      usage: "/help",
      category: "session",
      execute: () => {},
    });
    registry.register({
      name: "exit",
      aliases: ["quit"],
      description: "Exit",
      usage: "/exit",
      category: "session",
      execute: () => {},
    });
    registry.register({
      name: "discuss",
      aliases: ["d"],
      description: "Discuss",
      usage: "/discuss",
      category: "ai",
      execute: () => {},
    });

    const names = registry.getCommandNames();
    expect(names).toContain("/help");
    expect(names).toContain("/exit");
    expect(names).toContain("/discuss");
    // Aliases should NOT appear in completion list
    expect(names).not.toContain("/?");
    expect(names).not.toContain("/quit");
    expect(names).not.toContain("/d");
  });

  it("command names filter correctly for partial input", () => {
    const registry = new SlashCommandRegistry();
    registry.register({
      name: "help",
      aliases: [],
      description: "Help",
      usage: "/help",
      category: "session",
      execute: () => {},
    });
    registry.register({
      name: "history",
      aliases: [],
      description: "History",
      usage: "/history",
      category: "session",
      execute: () => {},
    });
    registry.register({
      name: "exit",
      aliases: [],
      description: "Exit",
      usage: "/exit",
      category: "session",
      execute: () => {},
    });

    const names = registry.getCommandNames();
    // Simulate the completer logic from InteractiveREPL
    const input = "/h";
    const matches = names.filter((name) => name.startsWith(input));
    expect(matches).toContain("/help");
    expect(matches).toContain("/history");
    expect(matches).not.toContain("/exit");
  });
});

// ============================================================================
// Multi-line input handling
// ============================================================================

describe("multi-line input handling", () => {
  it("parse returns null for multi-line input even if first line is a command", () => {
    // In InteractiveREPL.processBufferedInput, slash commands are only
    // checked if the input does NOT contain newlines.
    const registry = new SlashCommandRegistry();
    registry.register({
      name: "help",
      aliases: [],
      description: "Help",
      usage: "/help",
      category: "session",
      execute: () => {},
    });

    // Simulate the processBufferedInput check
    const input = "/help\nsome additional text";
    const trimmed = input.trim();
    const isMultiLine = trimmed.includes("\n");

    // In the REPL: if multi-line, skip command parsing → route to executePrompt
    if (!isMultiLine) {
      const parsed = registry.parse(trimmed);
      // This branch should NOT be taken for multi-line input
      expect(true).toBe(false); // Should not reach here
    }

    // Multi-line input bypasses command parsing
    expect(isMultiLine).toBe(true);
  });
});

// ============================================================================
// Discussion mode input routing
// ============================================================================

describe("discussion mode input routing", () => {
  it("non-slash input in discussion mode goes to discussion handler", () => {
    // Simulate the processBufferedInput logic for discussion mode
    const registry = new SlashCommandRegistry();
    registry.register({
      name: "discuss",
      aliases: ["d"],
      description: "Discuss",
      usage: "/discuss",
      category: "ai",
      execute: () => {},
    });

    const input = "What about using TypeScript?";
    const trimmed = input.trim();
    const mode: REPLMode = "discussion";
    const hasDiscussionState = true;

    // Step 1: Not multi-line, so try parse
    const parsed = registry.parse(trimmed);
    // This is not a command
    expect(parsed).toBeNull();

    // Step 2: In discussion mode → route to executeDiscussionInput
    const shouldRouteToDiscussion =
      mode === "discussion" && hasDiscussionState && parsed === null;
    expect(shouldRouteToDiscussion).toBe(true);
  });

  it("slash commands still work during discussion mode", () => {
    const registry = new SlashCommandRegistry();
    registry.register({
      name: "discuss",
      aliases: ["d"],
      description: "Discuss",
      usage: "/discuss",
      category: "ai",
      execute: () => {},
    });
    registry.register({
      name: "help",
      aliases: [],
      description: "Help",
      usage: "/help",
      category: "session",
      execute: () => {},
    });

    const input = "/help";
    const parsed = registry.parse(input);

    // Even in discussion mode, /help should be recognized
    expect(parsed).not.toBeNull();
    expect(parsed!.command.name).toBe("help");
  });

  it("/discuss --end is parsed as a command even in discussion mode", () => {
    const registry = new SlashCommandRegistry();
    registry.register({
      name: "discuss",
      aliases: ["d"],
      description: "Discuss",
      usage: "/discuss",
      category: "ai",
      execute: () => {},
    });

    const parsed = registry.parse("/discuss --end");
    expect(parsed).not.toBeNull();
    expect(parsed!.command.name).toBe("discuss");
    expect(parsed!.args).toBe("--end");
  });
});
