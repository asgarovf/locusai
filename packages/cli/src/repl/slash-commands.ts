import { c, type AiProvider, type HistoryManager } from "@locusai/sdk/node";

export type SlashCommandCategory = "session" | "ai" | "config" | "navigation";

/**
 * Minimal session interface that slash commands can depend on.
 * Both InteractiveSession and InteractiveREPL satisfy this contract.
 */
export interface REPLSession {
  getSessionId(): string;
  getHistoryManager(): HistoryManager;
  resetContext(): void;
  shutdown(): void;
  getProjectPath(): string;
  getProvider(): AiProvider;
  getModel(): string;
  setProvider(provider: AiProvider): void;
  setModel(model: string): void;
}

export interface SlashCommand {
  /** Command name without the leading slash */
  name: string;
  /** Alternative names (without slashes) */
  aliases: string[];
  description: string;
  /** Usage example, e.g. "/history [limit]" */
  usage: string;
  category: SlashCommandCategory;
  execute: (session: REPLSession, args?: string) => Promise<void> | void;
}

export interface ParsedCommand {
  command: SlashCommand;
  args: string;
}

const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  session: "Session",
  ai: "AI",
  config: "Configuration",
  navigation: "Navigation",
};

const CATEGORY_ORDER: SlashCommandCategory[] = [
  "session",
  "ai",
  "config",
  "navigation",
];

export class SlashCommandRegistry {
  private commands: Map<string, SlashCommand> = new Map();

  /**
   * Register a slash command.
   */
  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  /**
   * Parse user input and return a matched command with extracted args.
   *
   * Supports two input styles:
   *   - Slash syntax: "/exit", "/history 20"
   *   - Bare-word syntax (backward compat): "exit", "help"
   *
   * Returns null if the input is not a recognized command (treat as prompt).
   */
  parse(input: string): ParsedCommand | null {
    const trimmed = input.trim();
    if (trimmed === "") return null;

    const isSlash = trimmed.startsWith("/");
    const withoutSlash = isSlash ? trimmed.slice(1) : trimmed;

    // Split into command token and remaining args
    const spaceIdx = withoutSlash.indexOf(" ");
    const token =
      spaceIdx === -1
        ? withoutSlash.toLowerCase()
        : withoutSlash.slice(0, spaceIdx).toLowerCase();
    const args = spaceIdx === -1 ? "" : withoutSlash.slice(spaceIdx + 1).trim();

    // Match against registered commands by name or alias
    for (const cmd of this.commands.values()) {
      if (cmd.name === token || cmd.aliases.includes(token)) {
        return { command: cmd, args };
      }
    }

    // If it started with "/" but didn't match, it's an unknown slash command
    if (isSlash) {
      this.showUnknownCommand(token);
      return { command: this.createNoopCommand(), args: "" };
    }

    // Bare word that didn't match — treat as a prompt
    return null;
  }

  /**
   * Get all registered commands.
   */
  getAll(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands grouped by category, in display order.
   */
  getByCategory(): Map<SlashCommandCategory, SlashCommand[]> {
    const grouped = new Map<SlashCommandCategory, SlashCommand[]>();

    for (const category of CATEGORY_ORDER) {
      const cmds = this.getAll().filter((cmd) => cmd.category === category);
      if (cmds.length > 0) {
        grouped.set(category, cmds);
      }
    }

    return grouped;
  }

  /**
   * Display help for all registered slash commands, grouped by category.
   */
  showHelp(): void {
    const grouped = this.getByCategory();

    console.log(`\n  ${c.primary("Available Commands")}\n`);

    for (const [category, cmds] of grouped) {
      const label = CATEGORY_LABELS[category];
      console.log(`  ${c.dim(`── ${label} ──`)}`);

      for (const cmd of cmds) {
        const aliasStr =
          cmd.aliases.length > 0
            ? ` ${c.dim(`(${cmd.aliases.map((a) => `/${a}`).join(", ")})`)}`
            : "";
        const usage = cmd.usage ? `  ${c.dim(cmd.usage)}` : "";
        console.log(
          `  ${c.success(`/${cmd.name}`)}${aliasStr}  ${cmd.description}${usage}`
        );
      }
      console.log();
    }

    console.log(
      `  ${c.dim("Any other input will be sent as a prompt to the AI.")}\n`
    );
  }

  /**
   * Show an error for an unrecognized slash command with suggestions.
   */
  private showUnknownCommand(token: string): void {
    const suggestions = this.findSimilar(token, 3);
    console.log(`\n  ${c.error(`Unknown command: /${token}`)}`);

    if (suggestions.length > 0) {
      console.log(
        `  ${c.dim("Did you mean:")} ${suggestions.map((s) => c.success(`/${s.name}`)).join(", ")}`
      );
    }

    console.log(`  ${c.dim("Type /help to see all available commands.")}\n`);
  }

  /**
   * Find commands with names similar to the given token (simple prefix/substring match).
   */
  private findSimilar(token: string, limit: number): SlashCommand[] {
    const all = this.getAll();
    const scored: Array<{ cmd: SlashCommand; score: number }> = [];

    for (const cmd of all) {
      const names = [cmd.name, ...cmd.aliases];
      let bestScore = 0;

      for (const name of names) {
        // Prefix match gets highest score
        if (name.startsWith(token)) {
          bestScore = Math.max(bestScore, 3);
        } else if (token.startsWith(name)) {
          bestScore = Math.max(bestScore, 2);
        } else if (name.includes(token) || token.includes(name)) {
          bestScore = Math.max(bestScore, 1);
        }
      }

      if (bestScore > 0) {
        scored.push({ cmd, score: bestScore });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.cmd);
  }

  /**
   * Create a no-op command placeholder for unknown slash commands.
   * This lets the caller treat the result uniformly (command was handled).
   */
  private createNoopCommand(): SlashCommand {
    return {
      name: "__noop__",
      aliases: [],
      description: "",
      usage: "",
      category: "session",
      execute: () => {
        // No-op: unknown command was already reported to the user
      },
    };
  }
}
