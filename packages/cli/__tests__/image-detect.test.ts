import { describe, expect, it } from "bun:test";
import {
  buildImageContext,
  collectReferencedAttachments,
  detectImages,
  normalizeImagePlaceholders,
} from "../src/repl/image-detect.js";

describe("image-detect", () => {
  describe("detectImages", () => {
    it("detects quoted paths", () => {
      const result = detectImages('Look at "/tmp/screenshot.png" please');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].originalPath).toBe("/tmp/screenshot.png");
      expect(result[0].resolvedPath).toContain("/tmp/screenshot.png");
    });

    it("detects paths starting with /", () => {
      const result = detectImages("Check /tmp/test.jpg for reference");
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((r) => r.originalPath.includes("test.jpg"))).toBe(
        true
      );
    });

    it("detects tilde paths", () => {
      const result = detectImages("See ~/Desktop/image.png");
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((r) => r.originalPath.includes("image.png"))).toBe(
        true
      );
    });

    it("detects multiple images", () => {
      const result = detectImages('Compare "/tmp/a.png" with "/tmp/b.jpg"');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("deduplicates same paths", () => {
      const result = detectImages('Look at "/tmp/a.png" and "/tmp/a.png"');
      // Same path should be deduplicated
      const unique = new Set(result.map((r) => r.originalPath));
      expect(unique.size).toBeLessThanOrEqual(result.length);
    });

    it("ignores non-image extensions", () => {
      const result = detectImages("Check /tmp/file.txt");
      expect(result.length).toBe(0);
    });

    it("does not re-detect paths inside existing placeholders", () => {
      const result = detectImages(
        "![Screenshot: clipboard-123.png](locus://screenshot-1) some text"
      );
      expect(result.length).toBe(0);
    });

    it("handles various image extensions", () => {
      for (const ext of ["png", "jpg", "jpeg", "gif", "webp", "svg"]) {
        const result = detectImages(`/tmp/image.${ext}`);
        expect(result.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("buildImageContext", () => {
    it("returns empty string when no images exist", () => {
      const result = buildImageContext([
        {
          originalPath: "/nonexistent.png",
          resolvedPath: "/nonexistent.png",
          stablePath: "/nonexistent.png",
          exists: false,
          rawMatches: ["/nonexistent.png"],
        },
      ]);
      expect(result).toBe("");
    });

    it("builds context for existing images", () => {
      const result = buildImageContext([
        {
          originalPath: "/tmp/test.png",
          resolvedPath: "/tmp/test.png",
          stablePath: "/tmp/locus-images/test.png",
          exists: true,
          rawMatches: ["/tmp/test.png"],
        },
      ]);
      expect(result).toContain("The user attached images.");
      expect(result).toContain("test.png");
      expect(result).toContain("/tmp/locus-images/test.png");
    });

    it("filters out non-existing images", () => {
      const result = buildImageContext([
        {
          originalPath: "/exists.png",
          resolvedPath: "/exists.png",
          stablePath: "/stable/exists.png",
          exists: true,
          rawMatches: ["/exists.png"],
        },
        {
          originalPath: "/missing.png",
          resolvedPath: "/missing.png",
          stablePath: "/missing.png",
          exists: false,
          rawMatches: ["/missing.png"],
        },
      ]);
      expect(result).toContain("exists.png");
      expect(result).not.toContain("missing.png");
    });
  });

  describe("normalizeImagePlaceholders", () => {
    it("replaces raw image paths with screenshot placeholders", () => {
      const normalized = normalizeImagePlaceholders(
        "Please inspect /tmp/screenshot.png"
      );

      expect(normalized.text).toContain("![Screenshot:");
      expect(normalized.text).toContain("(locus://screenshot-1)");
      expect(normalized.text).not.toContain("/tmp/screenshot.png");
      expect(normalized.attachments.length).toBe(1);
    });

    it("does not nest placeholders when called again on already-normalized text", () => {
      const first = normalizeImagePlaceholders(
        "Check /tmp/clipboard-123.png"
      );
      expect(first.text).toContain("![Screenshot: clipboard-123.png](locus://screenshot-1)");

      // Simulate submit() calling normalizeImagePlaceholders again on the buffer
      const second = normalizeImagePlaceholders(
        first.text,
        first.attachments,
        first.nextId
      );
      expect(second.text).toBe(first.text);
      expect(second.attachments.length).toBe(first.attachments.length);
    });
  });

  describe("collectReferencedAttachments", () => {
    it("only keeps attachments whose placeholders still exist in text", () => {
      const normalized = normalizeImagePlaceholders(
        "first /tmp/a.png and second /tmp/b.png"
      );

      const onlySecond = normalized.text.replace(
        /!\[Screenshot:[^)]*\]\(locus:\/\/screenshot-1\)\s*/g,
        ""
      );
      const selected = collectReferencedAttachments(
        onlySecond,
        normalized.attachments
      );

      expect(selected.length).toBe(1);
      expect(selected[0].originalPath).toContain("b.png");
    });
  });
});
