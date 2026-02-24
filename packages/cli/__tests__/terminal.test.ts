import { beforeEach, describe, expect, it } from "bun:test";
import {
  drawBox,
  horizontalRule,
  padEnd,
  resetCapabilities,
  stripAnsi,
  truncate,
  visualWidth,
} from "../src/display/terminal.js";

describe("terminal", () => {
  beforeEach(() => {
    resetCapabilities();
  });

  describe("stripAnsi", () => {
    it("removes ANSI color codes", () => {
      expect(stripAnsi("\x1b[31mhello\x1b[39m")).toBe("hello");
    });

    it("handles multiple codes", () => {
      expect(stripAnsi("\x1b[1m\x1b[31mbold red\x1b[39m\x1b[22m")).toBe(
        "bold red"
      );
    });

    it("returns plain text unchanged", () => {
      expect(stripAnsi("hello world")).toBe("hello world");
    });

    it("handles empty string", () => {
      expect(stripAnsi("")).toBe("");
    });
  });

  describe("visualWidth", () => {
    it("returns length for plain text", () => {
      expect(visualWidth("hello")).toBe(5);
    });

    it("excludes ANSI codes from width", () => {
      expect(visualWidth("\x1b[31mhello\x1b[39m")).toBe(5);
    });
  });

  describe("padEnd", () => {
    it("pads plain string", () => {
      expect(padEnd("hi", 5)).toBe("hi   ");
    });

    it("does not pad if already at width", () => {
      expect(padEnd("hello", 5)).toBe("hello");
    });

    it("does not pad if over width", () => {
      expect(padEnd("hello world", 5)).toBe("hello world");
    });

    it("pads ANSI-colored string based on visual width", () => {
      const colored = "\x1b[31mhi\x1b[39m";
      const padded = padEnd(colored, 5);
      // Visual width should be 5, actual string should have extra spaces
      expect(visualWidth(padded)).toBe(5);
    });
  });

  describe("truncate", () => {
    it("returns short string unchanged", () => {
      expect(truncate("hi", 10)).toBe("hi");
    });

    it("truncates long string with ellipsis", () => {
      const result = truncate("hello world this is long", 10);
      expect(result.length).toBeLessThanOrEqual(10);
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("horizontalRule", () => {
    it("creates a rule of the given width", () => {
      const rule = horizontalRule(5);
      expect(rule).toBe("─────");
    });
  });

  describe("drawBox", () => {
    it("draws a box around lines", () => {
      const result = drawBox(["hello"], { width: 12 });
      const lines = result.split("\n");
      expect(lines.length).toBe(3); // top, content, bottom
      expect(lines[0].startsWith("┌")).toBe(true);
      expect(lines[0].endsWith("┐")).toBe(true);
      expect(lines[1].startsWith("│")).toBe(true);
      expect(lines[1].endsWith("│")).toBe(true);
      expect(lines[2].startsWith("└")).toBe(true);
      expect(lines[2].endsWith("┘")).toBe(true);
    });

    it("draws a box with title", () => {
      const result = drawBox(["content"], { title: "Test", width: 20 });
      const lines = result.split("\n");
      expect(lines[0]).toContain("Test");
    });
  });
});
