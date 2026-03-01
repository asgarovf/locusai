import { describe, expect, it } from "bun:test";
import { getAllCommandNames, getSlashCommands } from "../src/repl/commands.js";

describe("repl slash commands", () => {
  it("includes verbose but not compact or provider commands", () => {
    const commands = getSlashCommands().map((cmd) => cmd.name);
    const allNames = getAllCommandNames();

    expect(commands).toContain("/verbose");
    expect(commands).not.toContain("/compact");
    expect(commands).not.toContain("/provider");
    expect(allNames).toContain("/v");
    expect(allNames).not.toContain("/c");
    expect(allNames).not.toContain("/p");
  });
});
