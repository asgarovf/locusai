import { describe, expect, it } from "bun:test";
import {
  countDiffChanges,
  renderCompactDiff,
  renderDiff,
} from "../src/display/diff-renderer.js";
import { stripAnsi } from "../src/display/terminal.js";

const SAMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc123..def456 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,6 @@
 import { foo } from "bar";
-import { old } from "legacy";
+import { updated } from "modern";
+import { extra } from "new";

 function main() {
   console.log("hello");`;

describe("diff-renderer", () => {
  describe("renderDiff", () => {
    it("renders file header", () => {
      const lines = renderDiff(SAMPLE_DIFF);
      const plain = lines.map(stripAnsi);
      const fileHeader = plain.find((l) => l.includes("src/index.ts"));
      expect(fileHeader).toBeTruthy();
    });

    it("renders additions with +", () => {
      const lines = renderDiff(SAMPLE_DIFF);
      const plain = lines.map(stripAnsi);
      const additions = plain.filter((l) => l.includes("+"));
      expect(additions.length).toBeGreaterThan(0);
    });

    it("renders deletions with -", () => {
      const lines = renderDiff(SAMPLE_DIFF);
      const plain = lines.map(stripAnsi);
      const deletions = plain.filter((l) => l.includes("-"));
      expect(deletions.length).toBeGreaterThan(0);
    });

    it("respects maxLines", () => {
      const lines = renderDiff(SAMPLE_DIFF, { maxLines: 3 });
      // Should have at most 3 counted lines + truncation message
      expect(lines.length).toBeLessThanOrEqual(6); // some lines don't count
    });

    it("handles empty diff", () => {
      const lines = renderDiff("");
      expect(lines.length).toBe(0);
    });
  });

  describe("renderCompactDiff", () => {
    it("shows only additions and deletions", () => {
      const lines = renderCompactDiff(SAMPLE_DIFF);
      const plain = lines.map(stripAnsi);
      // Should not contain file headers or context lines
      for (const line of plain) {
        expect(
          line.startsWith("+ ") ||
            line.startsWith("- ") ||
            line.startsWith("  ...")
        ).toBe(true);
      }
    });

    it("respects maxLines", () => {
      const lines = renderCompactDiff(SAMPLE_DIFF, 1);
      expect(lines.length).toBeLessThanOrEqual(2); // 1 line + truncation message
    });
  });

  describe("countDiffChanges", () => {
    it("counts additions and deletions", () => {
      const counts = countDiffChanges(SAMPLE_DIFF);
      expect(counts.additions).toBe(2);
      expect(counts.deletions).toBe(1);
    });

    it("counts files", () => {
      const counts = countDiffChanges(SAMPLE_DIFF);
      expect(counts.files).toBe(1);
    });

    it("handles multi-file diff", () => {
      const multiDiff = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
-old
+new
diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -1 +1 @@
-foo
+bar`;
      const counts = countDiffChanges(multiDiff);
      expect(counts.files).toBe(2);
      expect(counts.additions).toBe(2);
      expect(counts.deletions).toBe(2);
    });

    it("handles empty diff", () => {
      const counts = countDiffChanges("");
      expect(counts.additions).toBe(0);
      expect(counts.deletions).toBe(0);
      expect(counts.files).toBe(0);
    });
  });
});
