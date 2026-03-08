import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareTranscript } from "../src/core/memory-capture.js";
import {
  appendMemoryEntries,
  ensureMemoryDir,
  readMemoryFile,
} from "../src/core/memory.js";

const TEST_DIR = join(tmpdir(), `locus-test-capture-${Date.now()}`);

describe("memory-capture", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("prepareTranscript", () => {
    it("returns empty string for empty messages", () => {
      expect(prepareTranscript([])).toBe("");
    });

    it("returns empty string for undefined-like input", () => {
      expect(prepareTranscript(null as unknown as [])).toBe("");
    });

    it("formats user and assistant messages", () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];
      const result = prepareTranscript(messages);
      expect(result).toContain("### User\nHello");
      expect(result).toContain("### Assistant\nHi there");
    });

    it("separates messages with double newlines", () => {
      const messages = [
        { role: "user", content: "First" },
        { role: "assistant", content: "Second" },
      ];
      const result = prepareTranscript(messages);
      expect(result).toContain("### User\nFirst\n\n### Assistant\nSecond");
    });

    it("truncates long transcripts", () => {
      // Create a message that exceeds 32000 chars
      const longContent = "x".repeat(40_000);
      const messages = [{ role: "user", content: longContent }];
      const result = prepareTranscript(messages);
      expect(result.length).toBeLessThan(40_000);
      expect(result).toContain("...(truncated)");
    });

    it("does not truncate short transcripts", () => {
      const messages = [{ role: "user", content: "Short message" }];
      const result = prepareTranscript(messages);
      expect(result).not.toContain("...(truncated)");
    });

    it("handles multiple messages in sequence", () => {
      const messages = [
        { role: "user", content: "Q1" },
        { role: "assistant", content: "A1" },
        { role: "user", content: "Q2" },
        { role: "assistant", content: "A2" },
      ];
      const result = prepareTranscript(messages);
      expect(result).toContain("### User\nQ1");
      expect(result).toContain("### Assistant\nA1");
      expect(result).toContain("### User\nQ2");
      expect(result).toContain("### Assistant\nA2");
    });
  });

  describe("captureMemoryFromSession integration", () => {
    // These tests verify the appendMemoryEntries integration path
    // without calling the AI, since we can't mock subprocess spawning easily.

    it("appendMemoryEntries writes valid entries to correct files", async () => {
      await ensureMemoryDir(TEST_DIR);

      const entries = [
        { category: "architecture", text: "SDK exports shared types" },
        { category: "debugging", text: "Bun needs --watch for hot reload" },
        { category: "conventions", text: "Use camelCase everywhere" },
      ];

      await appendMemoryEntries(TEST_DIR, entries);

      const arch = await readMemoryFile(TEST_DIR, "architecture");
      expect(arch).toContain("SDK exports shared types");

      const debug = await readMemoryFile(TEST_DIR, "debugging");
      expect(debug).toContain("Bun needs --watch for hot reload");

      const conv = await readMemoryFile(TEST_DIR, "conventions");
      expect(conv).toContain("Use camelCase everywhere");
    });

    it("appendMemoryEntries skips entries with invalid categories", async () => {
      await ensureMemoryDir(TEST_DIR);

      const entries = [
        { category: "invalid_category", text: "Should be skipped" },
        { category: "architecture", text: "Should be written" },
      ];

      await appendMemoryEntries(TEST_DIR, entries);

      const arch = await readMemoryFile(TEST_DIR, "architecture");
      expect(arch).toContain("Should be written");

      // Invalid category file doesn't exist, so nothing was written for it
      const all = await readMemoryFile(TEST_DIR, "invalid_category");
      expect(all).toBe("");
    });
  });
});
