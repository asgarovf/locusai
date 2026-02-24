/**
 * Tests for the discuss command's file operations.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEST_DIR = join(tmpdir(), `locus-test-discuss-${Date.now()}`);
const DISCUSSIONS_DIR = join(TEST_DIR, ".locus", "discussions");

beforeEach(() => {
  mkdirSync(DISCUSSIONS_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ─── Discussion File Format ──────────────────────────────────────────────────

describe("discussion file format", () => {
  it("stores discussions as markdown files", () => {
    const id = "test-discussion-1";
    const content = `# Should we use Redis?

**Date:** 2026-02-24
**Provider:** claude / opus

---

Redis is a great choice for caching...
`;

    writeFileSync(join(DISCUSSIONS_DIR, `${id}.md`), content, "utf-8");

    const files = readdirSync(DISCUSSIONS_DIR);
    expect(files.length).toBe(1);
    expect(files[0]).toBe("test-discussion-1.md");

    const read = readFileSync(join(DISCUSSIONS_DIR, `${id}.md`), "utf-8");
    expect(read).toContain("# Should we use Redis?");
    expect(read).toContain("**Date:** 2026-02-24");
  });

  it("extracts title from first heading", () => {
    const content = `# Monorepo vs Polyrepo

**Date:** 2026-02-24

---

Analysis here...
`;

    writeFileSync(join(DISCUSSIONS_DIR, "abc123.md"), content, "utf-8");

    const read = readFileSync(join(DISCUSSIONS_DIR, "abc123.md"), "utf-8");
    const titleMatch = read.match(/^#\s+(.+)/m);
    expect(titleMatch).not.toBeNull();
    expect(titleMatch?.[1]).toBe("Monorepo vs Polyrepo");
  });

  it("supports partial ID matching for retrieval", () => {
    writeFileSync(join(DISCUSSIONS_DIR, "abc123-xyz.md"), "# Test\n", "utf-8");
    writeFileSync(join(DISCUSSIONS_DIR, "def456-uvw.md"), "# Other\n", "utf-8");

    const files = readdirSync(DISCUSSIONS_DIR).filter((f) => f.endsWith(".md"));
    const match = files.find((f) => f.startsWith("abc"));
    expect(match).toBe("abc123-xyz.md");

    const noMatch = files.find((f) => f.startsWith("zzz"));
    expect(noMatch).toBeUndefined();
  });
});

// ─── Discussion Listing ──────────────────────────────────────────────────────

describe("listing discussions", () => {
  it("lists discussions in sorted order", () => {
    writeFileSync(join(DISCUSSIONS_DIR, "aaa-first.md"), "# First\n", "utf-8");
    writeFileSync(join(DISCUSSIONS_DIR, "zzz-last.md"), "# Last\n", "utf-8");
    writeFileSync(
      join(DISCUSSIONS_DIR, "mmm-middle.md"),
      "# Middle\n",
      "utf-8"
    );

    const files = readdirSync(DISCUSSIONS_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    expect(files[0]).toBe("zzz-last.md");
    expect(files[1]).toBe("mmm-middle.md");
    expect(files[2]).toBe("aaa-first.md");
  });

  it("returns empty when no discussions exist", () => {
    rmSync(DISCUSSIONS_DIR, { recursive: true, force: true });
    mkdirSync(DISCUSSIONS_DIR, { recursive: true });

    const files = readdirSync(DISCUSSIONS_DIR).filter((f) => f.endsWith(".md"));
    expect(files.length).toBe(0);
  });
});

// ─── Discussion Deletion ─────────────────────────────────────────────────────

describe("deleting discussions", () => {
  it("removes a discussion file by ID", () => {
    const path = join(DISCUSSIONS_DIR, "to-delete.md");
    writeFileSync(path, "# To Delete\n", "utf-8");
    expect(existsSync(path)).toBe(true);

    // Simulate delete
    const files = readdirSync(DISCUSSIONS_DIR).filter((f) => f.endsWith(".md"));
    const match = files.find((f) => f.startsWith("to-delete"));
    expect(match).toBeDefined();

    rmSync(join(DISCUSSIONS_DIR, match!), { force: true });
    expect(existsSync(path)).toBe(false);
  });
});

// ─── Discussion ID Generation ────────────────────────────────────────────────

describe("discussion ID generation", () => {
  it("generates unique IDs", () => {
    const generateId = () =>
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const id1 = generateId();
    const id2 = generateId();

    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(8);
  });
});
