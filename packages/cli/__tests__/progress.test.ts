import { describe, expect, it } from "bun:test";
import {
  createTimer,
  progressBar,
  renderTaskStatus,
} from "../src/display/progress.js";
import { stripAnsi } from "../src/display/terminal.js";

describe("progress", () => {
  describe("progressBar", () => {
    it("renders 0% progress", () => {
      const bar = progressBar(0, 10);
      const plain = stripAnsi(bar);
      expect(plain).toContain("0%");
      expect(plain).toContain("(0/10)");
    });

    it("renders 50% progress", () => {
      const bar = progressBar(5, 10);
      const plain = stripAnsi(bar);
      expect(plain).toContain("50%");
      expect(plain).toContain("(5/10)");
    });

    it("renders 100% progress", () => {
      const bar = progressBar(10, 10);
      const plain = stripAnsi(bar);
      expect(plain).toContain("100%");
      expect(plain).toContain("(10/10)");
    });

    it("handles zero total", () => {
      const bar = progressBar(0, 0);
      const plain = stripAnsi(bar);
      expect(plain).toContain("0%");
    });

    it("includes label when provided", () => {
      const bar = progressBar(3, 10, { label: "Tasks" });
      const plain = stripAnsi(bar);
      expect(plain).toContain("Tasks");
    });

    it("hides percent when showPercent is false", () => {
      const bar = progressBar(5, 10, { showPercent: false });
      const plain = stripAnsi(bar);
      expect(plain).not.toContain("50%");
    });

    it("hides count when showCount is false", () => {
      const bar = progressBar(5, 10, { showCount: false });
      const plain = stripAnsi(bar);
      expect(plain).not.toContain("(5/10)");
    });
  });

  describe("createTimer", () => {
    it("returns elapsed time and formatted string", () => {
      const timer = createTimer();
      const elapsed = timer.elapsed();
      expect(elapsed).toBeGreaterThanOrEqual(0);
      // formatted() returns a duration string like "0ms", "1.2s", etc.
      const formatted = timer.formatted();
      expect(formatted).toMatch(/^\d+ms$|^\d+\.\d+s$|^\d+m \d+s$/);
    });
  });

  describe("renderTaskStatus", () => {
    it("renders pending task", () => {
      const result = renderTaskStatus(42, "Fix bug", "pending");
      const plain = stripAnsi(result);
      expect(plain).toContain("#42");
      expect(plain).toContain("Fix bug");
    });

    it("renders done task", () => {
      const result = renderTaskStatus(42, "Fix bug", "done");
      const plain = stripAnsi(result);
      expect(plain).toContain("#42");
      expect(plain).toContain("Fix bug");
    });

    it("renders failed task", () => {
      const result = renderTaskStatus(42, "Fix bug", "failed");
      const plain = stripAnsi(result);
      expect(plain).toContain("#42");
    });

    it("includes extra info", () => {
      const result = renderTaskStatus(42, "Fix bug", "in_progress", "2m 30s");
      const plain = stripAnsi(result);
      expect(plain).toContain("2m 30s");
    });
  });
});
