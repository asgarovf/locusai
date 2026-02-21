import { describe, expect, it, beforeEach, spyOn } from "bun:test";
import {
  SlashCommandRegistry,
  type SlashCommand,
  type ParsedCommand,
  type REPLSession,
} from "../repl/slash-commands";

// ============================================================================
// Helpers
// ============================================================================

function createTestCommand(
  overrides: Partial<SlashCommand> = {}
): SlashCommand {
  return {
    name: overrides.name ?? "test",
    aliases: overrides.aliases ?? [],
    description: overrides.description ?? "A test command",
    usage: overrides.usage ?? "/test",
    category: overrides.category ?? "session",
    execute: overrides.execute ?? (() => {}),
  };
}

// ============================================================================
// SlashCommandRegistry — Registration & Retrieval
// ============================================================================

describe("SlashCommandRegistry", () => {
  let registry: SlashCommandRegistry;

  beforeEach(() => {
    registry = new SlashCommandRegistry();
  });

  describe("register and getAll", () => {
    it("starts empty", () => {
      expect(registry.getAll()).toEqual([]);
    });

    it("registers a single command", () => {
      const cmd = createTestCommand({ name: "foo" });
      registry.register(cmd);
      expect(registry.getAll()).toHaveLength(1);
      expect(registry.getAll()[0].name).toBe("foo");
    });

    it("registers multiple commands", () => {
      registry.register(createTestCommand({ name: "alpha" }));
      registry.register(createTestCommand({ name: "beta" }));
      registry.register(createTestCommand({ name: "gamma" }));
      expect(registry.getAll()).toHaveLength(3);
    });

    it("overwrites a command with the same name", () => {
      registry.register(
        createTestCommand({ name: "dup", description: "first" })
      );
      registry.register(
        createTestCommand({ name: "dup", description: "second" })
      );
      expect(registry.getAll()).toHaveLength(1);
      expect(registry.getAll()[0].description).toBe("second");
    });
  });

  // ============================================================================
  // parse() — Slash syntax
  // ============================================================================

  describe("parse — slash syntax", () => {
    beforeEach(() => {
      registry.register(
        createTestCommand({ name: "help", aliases: ["?", "h"] })
      );
      registry.register(
        createTestCommand({ name: "exit", aliases: ["quit", "q"] })
      );
      registry.register(
        createTestCommand({
          name: "discuss",
          aliases: ["d"],
          category: "ai",
        })
      );
      registry.register(
        createTestCommand({
          name: "plan",
          aliases: [],
          category: "ai",
        })
      );
    });

    it("parses /help", () => {
      const result = registry.parse("/help");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("help");
      expect(result!.args).toBe("");
    });

    it("parses /exit", () => {
      const result = registry.parse("/exit");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("exit");
    });

    it("parses /discuss with a topic argument", () => {
      const result = registry.parse("/discuss my topic");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("discuss");
      expect(result!.args).toBe("my topic");
    });

    it("parses /plan --list", () => {
      const result = registry.parse("/plan --list");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("plan");
      expect(result!.args).toBe("--list");
    });

    it("parses slash commands case-insensitively", () => {
      const result = registry.parse("/HELP");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("help");
    });

    it("trims leading/trailing whitespace", () => {
      const result = registry.parse("  /help  ");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("help");
    });

    it("extracts multi-word arguments correctly", () => {
      const result = registry.parse("/discuss refactor the auth module");
      expect(result).not.toBeNull();
      expect(result!.args).toBe("refactor the auth module");
    });

    it("handles trailing whitespace in args", () => {
      const result = registry.parse("/discuss topic   ");
      expect(result).not.toBeNull();
      expect(result!.args).toBe("topic");
    });
  });

  // ============================================================================
  // parse() — Alias matching
  // ============================================================================

  describe("parse — alias matching", () => {
    beforeEach(() => {
      registry.register(
        createTestCommand({ name: "help", aliases: ["?", "h"] })
      );
      registry.register(
        createTestCommand({ name: "exit", aliases: ["quit", "q"] })
      );
      registry.register(
        createTestCommand({ name: "discuss", aliases: ["d"] })
      );
    });

    it("matches by alias /? for help", () => {
      const result = registry.parse("/?");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("help");
    });

    it("matches by alias /h for help", () => {
      const result = registry.parse("/h");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("help");
    });

    it("matches by alias /q for exit", () => {
      const result = registry.parse("/q");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("exit");
    });

    it("matches by alias /quit for exit", () => {
      const result = registry.parse("/quit");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("exit");
    });

    it("matches by alias /d for discuss", () => {
      const result = registry.parse("/d some topic");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("discuss");
      expect(result!.args).toBe("some topic");
    });
  });

  // ============================================================================
  // parse() — Backward compatibility (bare word syntax)
  // ============================================================================

  describe("parse — bare word backward compatibility", () => {
    beforeEach(() => {
      registry.register(
        createTestCommand({ name: "exit", aliases: ["quit", "q"] })
      );
      registry.register(
        createTestCommand({ name: "help", aliases: ["?", "h"] })
      );
      registry.register(
        createTestCommand({ name: "clear", aliases: ["cls"] })
      );
    });

    it("bare 'exit' maps to the exit command", () => {
      const result = registry.parse("exit");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("exit");
    });

    it("bare 'quit' maps to the exit command via alias", () => {
      const result = registry.parse("quit");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("exit");
    });

    it("bare 'help' maps to the help command", () => {
      const result = registry.parse("help");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("help");
    });

    it("bare 'clear' maps to the clear command", () => {
      const result = registry.parse("clear");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("clear");
    });

    it("bare 'cls' maps to clear via alias", () => {
      const result = registry.parse("cls");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("clear");
    });
  });

  // ============================================================================
  // parse() — Non-slash input returns null
  // ============================================================================

  describe("parse — non-slash input", () => {
    beforeEach(() => {
      registry.register(
        createTestCommand({ name: "help", aliases: ["?", "h"] })
      );
    });

    it("returns null for plain text that is not a command", () => {
      expect(registry.parse("explain this code")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(registry.parse("")).toBeNull();
    });

    it("returns null for whitespace-only input", () => {
      expect(registry.parse("   ")).toBeNull();
    });

    it("returns null for text starting with a non-command word", () => {
      expect(registry.parse("please fix this bug")).toBeNull();
    });
  });

  // ============================================================================
  // parse() — Unknown slash commands
  // ============================================================================

  describe("parse — unknown slash commands", () => {
    beforeEach(() => {
      registry.register(
        createTestCommand({ name: "help", aliases: ["?"] })
      );
      // Suppress console output for these tests
      spyOn(console, "log").mockImplementation(() => {});
    });

    it("returns a noop command for unknown /foobar", () => {
      const result = registry.parse("/foobar");
      expect(result).not.toBeNull();
      expect(result!.command.name).toBe("__noop__");
    });

    it("noop command execute does nothing", () => {
      const result = registry.parse("/foobar");
      // Should not throw
      expect(() =>
        result!.command.execute({} as REPLSession)
      ).not.toThrow();
    });

    it("shows unknown command message", () => {
      const logSpy = spyOn(console, "log");
      registry.parse("/unknowncmd");
      const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("Unknown command");
      expect(output).toContain("unknowncmd");
    });
  });

  // ============================================================================
  // getCommandNames
  // ============================================================================

  describe("getCommandNames", () => {
    it("returns empty array when no commands registered", () => {
      expect(registry.getCommandNames()).toEqual([]);
    });

    it("returns command names prefixed with /", () => {
      registry.register(createTestCommand({ name: "help" }));
      registry.register(createTestCommand({ name: "exit" }));
      const names = registry.getCommandNames();
      expect(names).toContain("/help");
      expect(names).toContain("/exit");
    });

    it("does not include aliases in command names", () => {
      registry.register(
        createTestCommand({ name: "exit", aliases: ["quit", "q"] })
      );
      const names = registry.getCommandNames();
      expect(names).toEqual(["/exit"]);
      expect(names).not.toContain("/quit");
      expect(names).not.toContain("/q");
    });
  });

  // ============================================================================
  // getByCategory
  // ============================================================================

  describe("getByCategory", () => {
    it("groups commands by category", () => {
      registry.register(
        createTestCommand({ name: "exit", category: "session" })
      );
      registry.register(
        createTestCommand({ name: "help", category: "session" })
      );
      registry.register(
        createTestCommand({ name: "provider", category: "config" })
      );
      registry.register(
        createTestCommand({ name: "discuss", category: "ai" })
      );

      const grouped = registry.getByCategory();
      expect(grouped.get("session")).toHaveLength(2);
      expect(grouped.get("config")).toHaveLength(1);
      expect(grouped.get("ai")).toHaveLength(1);
    });

    it("omits categories with no commands", () => {
      registry.register(
        createTestCommand({ name: "exit", category: "session" })
      );
      const grouped = registry.getByCategory();
      expect(grouped.has("session")).toBe(true);
      expect(grouped.has("config")).toBe(false);
      expect(grouped.has("ai")).toBe(false);
    });
  });

  // ============================================================================
  // showHelp
  // ============================================================================

  describe("showHelp", () => {
    it("prints help grouped by category", () => {
      registry.register(
        createTestCommand({
          name: "exit",
          category: "session",
          description: "Exit interactive mode",
        })
      );
      registry.register(
        createTestCommand({
          name: "discuss",
          category: "ai",
          description: "Start a discussion",
        })
      );

      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      registry.showHelp();

      const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("SESSION");
      expect(output).toContain("exit");
      expect(output).toContain("AI");
      expect(output).toContain("discuss");
    });
  });

  // ============================================================================
  // Command execution
  // ============================================================================

  describe("command execution", () => {
    it("executes the matched command with correct session and args", async () => {
      let capturedSession: REPLSession | null = null;
      let capturedArgs: string | undefined;

      registry.register(
        createTestCommand({
          name: "test",
          execute: (session, args) => {
            capturedSession = session;
            capturedArgs = args;
          },
        })
      );

      const parsed = registry.parse("/test some args");
      expect(parsed).not.toBeNull();

      const mockSession = { getSessionId: () => "mock-id" } as REPLSession;
      await parsed!.command.execute(mockSession, parsed!.args);

      expect(capturedSession).not.toBeNull();
      expect(capturedSession!.getSessionId()).toBe("mock-id");
      expect(capturedArgs).toBe("some args");
    });

    it("handles async command execution", async () => {
      let executed = false;

      registry.register(
        createTestCommand({
          name: "async-cmd",
          execute: async () => {
            await new Promise((r) => setTimeout(r, 10));
            executed = true;
          },
        })
      );

      const parsed = registry.parse("/async-cmd");
      await parsed!.command.execute({} as REPLSession);
      expect(executed).toBe(true);
    });
  });
});

// ============================================================================
// Global registry integration
// ============================================================================

describe("global registry (commands.ts)", () => {
  it("has all expected built-in commands registered", async () => {
    // Import the real global registry
    const { registry } = await import("../repl/commands");
    const names = registry.getAll().map((c) => c.name);

    // Session commands
    expect(names).toContain("exit");
    expect(names).toContain("clear");
    expect(names).toContain("reset");
    expect(names).toContain("session");
    expect(names).toContain("status");
    expect(names).toContain("history");
    expect(names).toContain("help");

    // Config commands
    expect(names).toContain("provider");
    expect(names).toContain("model");

    // AI commands
    expect(names).toContain("discuss");
    expect(names).toContain("plan");
    expect(names).toContain("review");
    expect(names).toContain("artifacts");
  });

  it("parseCommand returns correct shape for slash input", async () => {
    const { parseCommand } = await import("../repl/commands");
    const result = parseCommand("/help");
    expect(result).not.toBeNull();
    expect(result!.command.name).toBe("help");
    expect(result!.args).toBe("");
  });

  it("parseCommand returns null for non-command input", async () => {
    const { parseCommand } = await import("../repl/commands");
    expect(parseCommand("explain this code")).toBeNull();
  });

  it("REPL_COMMANDS legacy export has expected length", async () => {
    const { REPL_COMMANDS, registry } = await import("../repl/commands");
    expect(REPL_COMMANDS.length).toBe(registry.getAll().length);
  });

  it("exit command has correct aliases", async () => {
    const { registry } = await import("../repl/commands");
    const exit = registry.getAll().find((c) => c.name === "exit");
    expect(exit).toBeDefined();
    expect(exit!.aliases).toContain("quit");
    expect(exit!.aliases).toContain("q");
  });

  it("help command has correct aliases", async () => {
    const { registry } = await import("../repl/commands");
    const help = registry.getAll().find((c) => c.name === "help");
    expect(help).toBeDefined();
    expect(help!.aliases).toContain("?");
    expect(help!.aliases).toContain("h");
  });
});
