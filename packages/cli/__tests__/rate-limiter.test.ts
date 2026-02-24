import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RateLimiter, resetRateLimiter } from "../src/core/rate-limiter.js";

const TEST_DIR = join(tmpdir(), `locus-test-ratelimit-${Date.now()}`);

describe("RateLimiter", () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, ".locus"), { recursive: true });
    resetRateLimiter();
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("initializes with default state when no persisted state", () => {
      const rl = new RateLimiter(TEST_DIR);
      const state = rl.getState();
      expect(state.limit).toBe(5000);
      expect(state.remaining).toBe(5000);
      expect(state.used).toBe(0);
    });

    it("works without projectRoot", () => {
      const rl = new RateLimiter();
      const state = rl.getState();
      expect(state.limit).toBe(5000);
    });
  });

  describe("updateFromHeaders", () => {
    it("updates state from headers", () => {
      const rl = new RateLimiter(TEST_DIR);
      rl.updateFromHeaders({
        "x-ratelimit-limit": "5000",
        "x-ratelimit-remaining": "4990",
        "x-ratelimit-used": "10",
        "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
      });

      const state = rl.getState();
      expect(state.limit).toBe(5000);
      expect(state.remaining).toBe(4990);
      expect(state.used).toBe(10);
    });

    it("increments session call count", () => {
      const rl = new RateLimiter(TEST_DIR);
      expect(rl.getSessionCallCount()).toBe(0);

      rl.updateFromHeaders({ "x-ratelimit-remaining": "4999" });
      expect(rl.getSessionCallCount()).toBe(1);

      rl.updateFromHeaders({ "x-ratelimit-remaining": "4998" });
      expect(rl.getSessionCallCount()).toBe(2);
    });

    it("persists state to disk", () => {
      const rl = new RateLimiter(TEST_DIR);
      rl.updateFromHeaders({ "x-ratelimit-remaining": "4000" });

      const statePath = join(TEST_DIR, ".locus", "rate-limit.json");
      expect(existsSync(statePath)).toBe(true);

      const persisted = JSON.parse(readFileSync(statePath, "utf-8"));
      expect(persisted.remaining).toBe(4000);
    });
  });

  describe("updateFromResponse", () => {
    it("extracts headers from response", () => {
      const rl = new RateLimiter(TEST_DIR);
      rl.updateFromResponse({
        headers: { "x-ratelimit-remaining": "100" },
      });
      expect(rl.getState().remaining).toBe(100);
    });

    it("handles response without headers", () => {
      const rl = new RateLimiter(TEST_DIR);
      rl.updateFromResponse({});
      expect(rl.getState().remaining).toBe(5000);
    });
  });

  describe("state persistence", () => {
    it("loads persisted state on construction", () => {
      // Create a limiter, update it, then create a new one
      const rl1 = new RateLimiter(TEST_DIR);
      rl1.updateFromHeaders({ "x-ratelimit-remaining": "1234" });

      const rl2 = new RateLimiter(TEST_DIR);
      expect(rl2.getState().remaining).toBe(1234);
    });
  });
});
