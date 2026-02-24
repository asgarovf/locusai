import { describe, expect, it } from "bun:test";
import {
  formatDuration,
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

  describe("formatDuration", () => {
    it("formats milliseconds", () => {
      expect(formatDuration(500)).toBe("500ms");
    });

    it("formats seconds", () => {
      expect(formatDuration(2500)).toBe("2.5s");
    });

    it("formats minutes and seconds", () => {
      expect(formatDuration(125000)).toBe("2m 5s");
    });

    it("formats exact minute boundary", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
    });

    it("formats zero", () => {
      expect(formatDuration(0)).toBe("0ms");
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
