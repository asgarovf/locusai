import { describe, expect, test } from "bun:test";
import { compareSemver } from "../src/commands/upgrade.js";

describe("compareSemver", () => {
  test("equal versions return 0", () => {
    expect(compareSemver("3.0.0", "3.0.0")).toBe(0);
  });

  test("a < b returns -1", () => {
    expect(compareSemver("3.0.0", "3.0.1")).toBe(-1);
    expect(compareSemver("3.0.0", "3.1.0")).toBe(-1);
    expect(compareSemver("3.0.0", "4.0.0")).toBe(-1);
  });

  test("a > b returns 1", () => {
    expect(compareSemver("3.1.0", "3.0.0")).toBe(1);
    expect(compareSemver("4.0.0", "3.9.9")).toBe(1);
    expect(compareSemver("3.0.1", "3.0.0")).toBe(1);
  });

  test("handles v prefix", () => {
    expect(compareSemver("v3.0.0", "3.0.0")).toBe(0);
    expect(compareSemver("v3.0.0", "v3.0.1")).toBe(-1);
  });

  test("handles missing patch version", () => {
    expect(compareSemver("3.0", "3.0.0")).toBe(0);
    expect(compareSemver("3", "3.0.0")).toBe(0);
  });

  test("major version comparison takes precedence", () => {
    expect(compareSemver("2.9.9", "3.0.0")).toBe(-1);
    expect(compareSemver("10.0.0", "9.9.9")).toBe(1);
  });

  test("minor version comparison", () => {
    expect(compareSemver("3.1.0", "3.2.0")).toBe(-1);
    expect(compareSemver("3.10.0", "3.2.0")).toBe(1);
  });

  test("patch version comparison", () => {
    expect(compareSemver("3.0.1", "3.0.2")).toBe(-1);
    expect(compareSemver("3.0.10", "3.0.2")).toBe(1);
  });
});
