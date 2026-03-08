import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MEMORY_CATEGORIES,
  appendMemoryEntries,
  ensureMemoryDir,
  getMemoryDir,
  getMemoryStats,
  readAllMemory,
  readMemoryFile,
} from "../src/core/memory.js";

const TEST_DIR = join(tmpdir(), `locus-test-memory-${Date.now()}`);

describe("memory", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("getMemoryDir", () => {
    it("returns correct path", () => {
      expect(getMemoryDir("/foo/bar")).toBe("/foo/bar/.locus/memory");
    });
  });

  describe("ensureMemoryDir", () => {
    it("creates directory and all category files", async () => {
      await ensureMemoryDir(TEST_DIR);

      const dir = getMemoryDir(TEST_DIR);
      expect(existsSync(dir)).toBe(true);

      for (const meta of Object.values(MEMORY_CATEGORIES)) {
        const filePath = join(dir, meta.file);
        expect(existsSync(filePath)).toBe(true);
        const content = readFileSync(filePath, "utf-8");
        expect(content).toContain(`# ${meta.title}`);
        expect(content).toContain(meta.description);
      }
    });

    it("does not overwrite existing files", async () => {
      await ensureMemoryDir(TEST_DIR);

      // Append custom content
      const archPath = join(getMemoryDir(TEST_DIR), "architecture.md");
      const original = readFileSync(archPath, "utf-8");
      const customContent = `${original}- **[Architecture]**: Custom entry\n`;
      require("node:fs").writeFileSync(archPath, customContent);

      // Re-run ensure — should not overwrite
      await ensureMemoryDir(TEST_DIR);
      const after = readFileSync(archPath, "utf-8");
      expect(after).toContain("Custom entry");
    });
  });

  describe("readMemoryFile", () => {
    it("returns empty string for non-existent directory", async () => {
      const result = await readMemoryFile(TEST_DIR, "architecture");
      expect(result).toBe("");
    });

    it("returns empty string for unknown category", async () => {
      const result = await readMemoryFile(TEST_DIR, "nonexistent");
      expect(result).toBe("");
    });

    it("reads existing category file", async () => {
      await ensureMemoryDir(TEST_DIR);
      const result = await readMemoryFile(TEST_DIR, "architecture");
      expect(result).toContain("# Architecture");
    });
  });

  describe("readAllMemory", () => {
    it("returns empty string when directory does not exist", async () => {
      const result = await readAllMemory(TEST_DIR);
      expect(result).toBe("");
    });

    it("concatenates all category files", async () => {
      await ensureMemoryDir(TEST_DIR);
      const result = await readAllMemory(TEST_DIR);

      for (const meta of Object.values(MEMORY_CATEGORIES)) {
        expect(result).toContain(`# ${meta.title}`);
      }
    });
  });

  describe("appendMemoryEntries", () => {
    it("appends entries to correct category files", async () => {
      await ensureMemoryDir(TEST_DIR);
      await appendMemoryEntries(TEST_DIR, [
        { category: "architecture", text: "SDK exports shared types" },
        { category: "debugging", text: "Bun needs --watch for hot reload" },
      ]);

      const arch = await readMemoryFile(TEST_DIR, "architecture");
      expect(arch).toContain("- **[Architecture]**: SDK exports shared types");

      const debug = await readMemoryFile(TEST_DIR, "debugging");
      expect(debug).toContain("- **[Debugging]**: Bun needs --watch for hot reload");
    });

    it("skips unknown categories without error", async () => {
      await ensureMemoryDir(TEST_DIR);
      await appendMemoryEntries(TEST_DIR, [
        { category: "nonexistent", text: "Should be ignored" },
      ]);
      // No throw — verify other files untouched
      const arch = await readMemoryFile(TEST_DIR, "architecture");
      expect(arch).not.toContain("Should be ignored");
    });

    it("appends multiple entries to the same category", async () => {
      await ensureMemoryDir(TEST_DIR);
      await appendMemoryEntries(TEST_DIR, [
        { category: "conventions", text: "Use camelCase" },
        { category: "conventions", text: "Use ESM imports" },
      ]);

      const conv = await readMemoryFile(TEST_DIR, "conventions");
      expect(conv).toContain("Use camelCase");
      expect(conv).toContain("Use ESM imports");
    });
  });

  describe("getMemoryStats", () => {
    it("returns zero stats when directory does not exist", async () => {
      const stats = await getMemoryStats(TEST_DIR);
      for (const key of Object.keys(MEMORY_CATEGORIES)) {
        expect(stats[key].count).toBe(0);
        expect(stats[key].size).toBe(0);
      }
    });

    it("returns accurate stats after entries are added", async () => {
      await ensureMemoryDir(TEST_DIR);
      await appendMemoryEntries(TEST_DIR, [
        { category: "architecture", text: "Entry one" },
        { category: "architecture", text: "Entry two" },
        { category: "decisions", text: "Use Bun over Node" },
      ]);

      const stats = await getMemoryStats(TEST_DIR);
      expect(stats.architecture.count).toBe(2);
      expect(stats.architecture.size).toBeGreaterThan(0);
      expect(stats.architecture.lastModified).toBeInstanceOf(Date);
      expect(stats.decisions.count).toBe(1);
      expect(stats.conventions.count).toBe(0);
    });
  });
});
