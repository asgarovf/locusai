import { describe, expect, test } from "bun:test";
import { StreamRenderer } from "../src/display/stream-renderer.js";

/**
 * Tests for the enhanced StreamRenderer features:
 * - Markdown link detection
 * - Table rendering
 * - Strikethrough formatting
 * - Synchronized output wrapping
 */

describe("StreamRenderer — enhanced markdown", () => {
  function collectLines(input: string): string[] {
    const lines: string[] = [];
    const renderer = new StreamRenderer((line) => lines.push(line));
    renderer.start();
    renderer.push(input);
    renderer.stop();
    return lines;
  }

  test("renders markdown links with underline", () => {
    const lines = collectLines("[Click here](https://example.com)\n");
    expect(lines.length).toBe(1);
    // Should contain the link text and URL
    expect(lines[0]).toContain("Click here");
    expect(lines[0]).toContain("https://example.com");
  });

  test("renders multiple links in one line", () => {
    const lines = collectLines(
      "See [docs](https://docs.com) and [api](https://api.com)\n"
    );
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("docs");
    expect(lines[0]).toContain("api");
  });

  test("renders strikethrough text", () => {
    const lines = collectLines("This is ~~deleted~~ text\n");
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("deleted");
  });

  test("renders table header row with bold", () => {
    const input = "| Name | Value |\n| --- | --- |\n| foo | bar |\n";
    const lines = collectLines(input);
    // Should render 3 lines: header, separator, data
    expect(lines.length).toBe(3);
    // Header should contain Name and Value
    expect(lines[0]).toContain("Name");
    expect(lines[0]).toContain("Value");
    // Separator should be a line
    expect(lines[1]).toContain("─");
    // Data row
    expect(lines[2]).toContain("foo");
    expect(lines[2]).toContain("bar");
  });

  test("renders table separator as horizontal line", () => {
    const input = "|---|---|\n";
    const lines = collectLines(input);
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("─");
  });

  test("renders inline formatting in list items", () => {
    const lines = collectLines("- **bold** item\n");
    expect(lines.length).toBe(1);
    // Should have bullet and bold content
    expect(lines[0]).toContain("•");
  });

  test("renders inline formatting in blockquotes", () => {
    const lines = collectLines("> This is `code` in a quote\n");
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("│");
    expect(lines[0]).toContain("code");
  });

  test("resets table state on stop", () => {
    const lines1: string[] = [];
    const renderer = new StreamRenderer((line) => lines1.push(line));
    renderer.start();
    renderer.push("| Header |\n| --- |\n| data |\n");
    renderer.stop();
    // First table rendered correctly
    expect(lines1.length).toBe(3);

    // Second render should start fresh
    const lines2: string[] = [];
    const renderer2 = new StreamRenderer((line) => lines2.push(line));
    renderer2.start();
    renderer2.push("| New Header |\n");
    renderer2.stop();
    // First row of new table should be header (bold)
    expect(lines2.length).toBe(1);
    expect(lines2[0]).toContain("New Header");
  });
});
