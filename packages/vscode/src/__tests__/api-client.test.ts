import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LocusApiClient } from "../services/api-client";

const TEST_DIR = join(import.meta.dir, ".test-api-client-workspace");
const LOCUS_DIR = join(TEST_DIR, ".locus");

beforeEach(() => {
  mkdirSync(LOCUS_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("LocusApiClient", () => {
  it("loads API key from settings.json", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "lk_test_key" })
    );

    const client = new LocusApiClient(TEST_DIR);
    expect(client.isConfigured()).toBe(true);
  });

  it("reports not configured when no API key", () => {
    writeFileSync(join(LOCUS_DIR, "settings.json"), JSON.stringify({}));

    const client = new LocusApiClient(TEST_DIR);
    expect(client.isConfigured()).toBe(false);
  });

  it("loads workspace ID from config.json", () => {
    writeFileSync(
      join(LOCUS_DIR, "config.json"),
      JSON.stringify({ workspaceId: "ws_123" })
    );
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "lk_test" })
    );

    const client = new LocusApiClient(TEST_DIR);
    expect(client.hasWorkspace()).toBe(true);
    expect(client.getWorkspaceId()).toBe("ws_123");
  });

  it("reports no workspace when config has no workspaceId", () => {
    writeFileSync(
      join(LOCUS_DIR, "config.json"),
      JSON.stringify({ version: "0.9.18" })
    );

    const client = new LocusApiClient(TEST_DIR);
    expect(client.hasWorkspace()).toBe(false);
    expect(client.getWorkspaceId()).toBeUndefined();
  });

  it("accepts override values in constructor", () => {
    const client = new LocusApiClient(TEST_DIR, {
      apiKey: "lk_override",
      workspaceId: "ws_override",
      apiBase: "https://custom.api.com/api",
    });

    expect(client.isConfigured()).toBe(true);
    expect(client.hasWorkspace()).toBe(true);
    expect(client.getWorkspaceId()).toBe("ws_override");
  });

  it("allows setting workspace ID after construction", () => {
    const client = new LocusApiClient(TEST_DIR);
    expect(client.hasWorkspace()).toBe(false);

    client.setWorkspaceId("ws_new");
    expect(client.hasWorkspace()).toBe(true);
    expect(client.getWorkspaceId()).toBe("ws_new");
  });

  it("uses default API base when none provided", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "lk_test" })
    );

    // Client should initialize without errors
    const client = new LocusApiClient(TEST_DIR);
    expect(client.isConfigured()).toBe(true);
  });

  it("uses apiUrl from settings when available", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({
        apiKey: "lk_test",
        apiUrl: "https://custom.api.com/api",
      })
    );

    const client = new LocusApiClient(TEST_DIR);
    expect(client.isConfigured()).toBe(true);
  });

  it("handles missing .locus directory gracefully", () => {
    rmSync(LOCUS_DIR, { recursive: true, force: true });

    const client = new LocusApiClient(TEST_DIR);
    expect(client.isConfigured()).toBe(false);
    expect(client.hasWorkspace()).toBe(false);
  });

  it("handles corrupted settings.json", () => {
    writeFileSync(join(LOCUS_DIR, "settings.json"), "not-json{");

    const client = new LocusApiClient(TEST_DIR);
    expect(client.isConfigured()).toBe(false);
  });

  it("handles corrupted config.json", () => {
    writeFileSync(join(LOCUS_DIR, "config.json"), "not-json{");
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "lk_test" })
    );

    const client = new LocusApiClient(TEST_DIR);
    expect(client.isConfigured()).toBe(true);
    expect(client.hasWorkspace()).toBe(false);
  });

  it("throws when listing tasks without workspace ID", async () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "lk_test" })
    );

    const client = new LocusApiClient(TEST_DIR);

    try {
      await client.listTasks();
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toContain("No workspace ID configured");
    }
  });

  it("throws when getting task without workspace ID", async () => {
    const client = new LocusApiClient(TEST_DIR);

    try {
      await client.getTask("task_123");
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No workspace ID configured");
    }
  });

  it("throws when updating task without workspace ID", async () => {
    const client = new LocusApiClient(TEST_DIR);

    try {
      await client.updateTask("task_123", { status: "DONE" });
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No workspace ID configured");
    }
  });

  it("throws when getting active sprint without workspace ID", async () => {
    const client = new LocusApiClient(TEST_DIR);

    try {
      await client.getActiveSprint();
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No workspace ID configured");
    }
  });
});
