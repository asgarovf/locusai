import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  getApiBase,
  getSessionsDir,
  getWorkspaceId,
  hasApiKey,
  isLocusInitialized,
  loadProjectConfig,
  loadSettings,
  saveWorkspaceId,
} from "../utils/config";

const TEST_DIR = join(import.meta.dir, ".test-config-workspace");
const LOCUS_DIR = join(TEST_DIR, ".locus");

beforeEach(() => {
  mkdirSync(LOCUS_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("isLocusInitialized", () => {
  it("returns false when .locus/config.json does not exist", () => {
    expect(isLocusInitialized(TEST_DIR)).toBe(false);
  });

  it("returns true when .locus/config.json exists", () => {
    writeFileSync(
      join(LOCUS_DIR, "config.json"),
      JSON.stringify({ version: "0.9.18" })
    );
    expect(isLocusInitialized(TEST_DIR)).toBe(true);
  });
});

describe("loadProjectConfig", () => {
  it("returns null when config file does not exist", () => {
    expect(loadProjectConfig(TEST_DIR)).toBeNull();
  });

  it("returns parsed config when file exists", () => {
    const config = {
      version: "0.9.18",
      createdAt: "2026-01-01T00:00:00.000Z",
      projectPath: ".",
    };
    writeFileSync(join(LOCUS_DIR, "config.json"), JSON.stringify(config));
    const result = loadProjectConfig(TEST_DIR);
    expect(result).toEqual(config);
  });

  it("returns null when config file contains invalid JSON", () => {
    writeFileSync(join(LOCUS_DIR, "config.json"), "not-json{");
    expect(loadProjectConfig(TEST_DIR)).toBeNull();
  });
});

describe("loadSettings", () => {
  it("returns empty object when settings file does not exist", () => {
    expect(loadSettings(TEST_DIR)).toEqual({});
  });

  it("returns parsed settings when file exists", () => {
    const settings = {
      apiKey: "lk_test123",
      provider: "claude",
    };
    writeFileSync(join(LOCUS_DIR, "settings.json"), JSON.stringify(settings));
    expect(loadSettings(TEST_DIR)).toEqual(settings);
  });

  it("returns empty object when settings file contains invalid JSON", () => {
    writeFileSync(join(LOCUS_DIR, "settings.json"), "{broken");
    expect(loadSettings(TEST_DIR)).toEqual({});
  });
});

describe("hasApiKey", () => {
  it("returns false when no settings file exists", () => {
    expect(hasApiKey(TEST_DIR)).toBe(false);
  });

  it("returns false when settings file has no apiKey", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ provider: "claude" })
    );
    expect(hasApiKey(TEST_DIR)).toBe(false);
  });

  it("returns true when settings file has an apiKey", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "lk_abc" })
    );
    expect(hasApiKey(TEST_DIR)).toBe(true);
  });

  it("returns false when apiKey is empty string", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "" })
    );
    expect(hasApiKey(TEST_DIR)).toBe(false);
  });
});

describe("getSessionsDir", () => {
  it("returns the correct sessions directory path", () => {
    const result = getSessionsDir(TEST_DIR);
    expect(result).toBe(join(TEST_DIR, ".locus", "sessions"));
  });
});

describe("getApiBase", () => {
  it("returns default API base when no settings", () => {
    expect(getApiBase(TEST_DIR)).toBe("https://api.locusai.dev/api");
  });

  it("returns custom API base from settings", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({
        apiUrl: "https://custom.api.com/api",
      })
    );
    expect(getApiBase(TEST_DIR)).toBe("https://custom.api.com/api");
  });

  it("returns default when settings has no apiUrl", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "lk_test" })
    );
    expect(getApiBase(TEST_DIR)).toBe("https://api.locusai.dev/api");
  });
});

describe("getWorkspaceId", () => {
  it("returns undefined when no config", () => {
    expect(getWorkspaceId(TEST_DIR)).toBeUndefined();
  });

  it("returns undefined when config has no workspaceId", () => {
    writeFileSync(
      join(LOCUS_DIR, "config.json"),
      JSON.stringify({ version: "0.9.18" })
    );
    expect(getWorkspaceId(TEST_DIR)).toBeUndefined();
  });

  it("returns workspace ID from config", () => {
    writeFileSync(
      join(LOCUS_DIR, "config.json"),
      JSON.stringify({
        version: "0.9.18",
        workspaceId: "ws_abc123",
      })
    );
    expect(getWorkspaceId(TEST_DIR)).toBe("ws_abc123");
  });
});

describe("saveWorkspaceId", () => {
  it("saves workspace ID to existing config.json", () => {
    writeFileSync(
      join(LOCUS_DIR, "config.json"),
      JSON.stringify({ version: "0.9.18" })
    );

    saveWorkspaceId(TEST_DIR, "ws_new_id");

    const config = JSON.parse(
      readFileSync(join(LOCUS_DIR, "config.json"), "utf-8")
    );
    expect(config.workspaceId).toBe("ws_new_id");
    expect(config.version).toBe("0.9.18");
  });

  it("creates config.json if it does not exist", () => {
    saveWorkspaceId(TEST_DIR, "ws_fresh_id");

    const config = JSON.parse(
      readFileSync(join(LOCUS_DIR, "config.json"), "utf-8")
    );
    expect(config.workspaceId).toBe("ws_fresh_id");
  });

  it("overwrites existing workspaceId", () => {
    writeFileSync(
      join(LOCUS_DIR, "config.json"),
      JSON.stringify({
        version: "0.9.18",
        workspaceId: "ws_old",
      })
    );

    saveWorkspaceId(TEST_DIR, "ws_updated");

    const config = JSON.parse(
      readFileSync(join(LOCUS_DIR, "config.json"), "utf-8")
    );
    expect(config.workspaceId).toBe("ws_updated");
  });

  it("handles corrupted config.json gracefully", () => {
    writeFileSync(join(LOCUS_DIR, "config.json"), "not-json{");

    saveWorkspaceId(TEST_DIR, "ws_recovery");

    const config = JSON.parse(
      readFileSync(join(LOCUS_DIR, "config.json"), "utf-8")
    );
    expect(config.workspaceId).toBe("ws_recovery");
  });
});
