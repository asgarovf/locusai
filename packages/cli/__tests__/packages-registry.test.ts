import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ─── HOME patching ────────────────────────────────────────────────────────────
// `os.homedir()` on POSIX respects the HOME environment variable, so we can
// point it at a temp directory for the duration of these tests.

const FAKE_HOME = join(tmpdir(), `locus-test-pkgs-${Date.now()}`);
const ORIGINAL_HOME = process.env.HOME;
process.env.HOME = FAKE_HOME;

// Import after patching HOME so path resolution inside the module uses
// FAKE_HOME throughout (homedir() is called lazily inside each function).
const {
  getPackagesDir,
  getRegistryPath,
  loadRegistry,
  saveRegistry,
  resolvePackageBinary,
  normalizePackageName,
  extractShortName,
} = await import("../src/packages/registry.js");

afterAll(() => {
  if (ORIGINAL_HOME !== undefined) {
    process.env.HOME = ORIGINAL_HOME;
  } else {
    delete process.env.HOME;
  }
});

// ─── getPackagesDir ───────────────────────────────────────────────────────────

describe("getPackagesDir", () => {
  beforeEach(() => {
    mkdirSync(FAKE_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(FAKE_HOME, { recursive: true, force: true });
  });

  it("creates the directory when it does not exist", () => {
    const dir = getPackagesDir();
    expect(existsSync(dir)).toBe(true);
  });

  it("seeds a private package.json when directory is new", () => {
    const dir = getPackagesDir();
    const pkgJson = join(dir, "package.json");
    expect(existsSync(pkgJson)).toBe(true);
    const content = JSON.parse(readFileSync(pkgJson, "utf-8")) as {
      private?: boolean;
    };
    expect(content.private).toBe(true);
  });

  it("does not overwrite an existing package.json", () => {
    const dir = getPackagesDir();
    const pkgJson = join(dir, "package.json");
    writeFileSync(pkgJson, JSON.stringify({ private: true, custom: 1 }));
    getPackagesDir(); // call again
    const content = JSON.parse(readFileSync(pkgJson, "utf-8")) as {
      custom?: number;
    };
    expect(content.custom).toBe(1);
  });
});

// ─── getRegistryPath ──────────────────────────────────────────────────────────

describe("getRegistryPath", () => {
  beforeEach(() => {
    mkdirSync(FAKE_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(FAKE_HOME, { recursive: true, force: true });
  });

  it("returns a path ending in registry.json inside the packages dir", () => {
    const p = getRegistryPath();
    expect(p.endsWith("registry.json")).toBe(true);
    expect(p).toContain("packages");
  });
});

// ─── loadRegistry ─────────────────────────────────────────────────────────────

describe("loadRegistry", () => {
  beforeEach(() => {
    mkdirSync(FAKE_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(FAKE_HOME, { recursive: true, force: true });
  });

  it("returns empty registry when file does not exist", () => {
    const registry = loadRegistry();
    expect(registry).toEqual({ packages: {} });
  });

  it("returns empty registry when file contains invalid JSON", () => {
    const registryPath = getRegistryPath();
    writeFileSync(registryPath, "not-json");
    const registry = loadRegistry();
    expect(registry).toEqual({ packages: {} });
  });

  it("returns empty registry when JSON lacks packages key", () => {
    const registryPath = getRegistryPath();
    writeFileSync(registryPath, JSON.stringify({ foo: "bar" }));
    const registry = loadRegistry();
    expect(registry).toEqual({ packages: {} });
  });

  it("parses a valid registry file", () => {
    const registryPath = getRegistryPath();
    const data = {
      packages: {
        "@locusai/locus-telegram": {
          name: "@locusai/locus-telegram",
          version: "1.0.0",
          installedAt: "2024-01-01T00:00:00.000Z",
          binaryPath: "/fake/bin/locus-telegram",
          manifest: {
            displayName: "Telegram",
            description: "Remote control via Telegram",
            commands: ["telegram"],
            version: "1.0.0",
          },
        },
      },
    };
    writeFileSync(registryPath, JSON.stringify(data));
    const registry = loadRegistry();
    expect(registry.packages["@locusai/locus-telegram"].name).toBe(
      "@locusai/locus-telegram"
    );
    expect(registry.packages["@locusai/locus-telegram"].version).toBe("1.0.0");
  });
});

// ─── saveRegistry ─────────────────────────────────────────────────────────────

describe("saveRegistry", () => {
  beforeEach(() => {
    mkdirSync(FAKE_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(FAKE_HOME, { recursive: true, force: true });
  });

  it("persists the registry and can be reloaded", () => {
    const registry = {
      packages: {
        "@locusai/locus-telegram": {
          name: "@locusai/locus-telegram",
          version: "0.21.8",
          installedAt: "2024-06-01T12:00:00.000Z",
          binaryPath: "/some/path/locus-telegram",
          manifest: {
            displayName: "Telegram",
            description: "Remote-control your Locus agent from Telegram",
            commands: ["telegram"],
            version: "0.21.8",
          },
        },
      },
    };

    saveRegistry(registry);
    const reloaded = loadRegistry();
    expect(reloaded.packages["@locusai/locus-telegram"].name).toBe(
      "@locusai/locus-telegram"
    );
    expect(reloaded.packages["@locusai/locus-telegram"].version).toBe("0.21.8");
  });
});

// ─── resolvePackageBinary ─────────────────────────────────────────────────────

describe("resolvePackageBinary", () => {
  beforeEach(() => {
    mkdirSync(FAKE_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(FAKE_HOME, { recursive: true, force: true });
  });

  it("returns null when binary does not exist", () => {
    expect(resolvePackageBinary("telegram")).toBeNull();
  });

  it("returns the binary path when it exists (short name)", () => {
    const dir = getPackagesDir();
    const binDir = join(dir, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    // npm creates .bin/ entries using the name after the scope
    const binPath = join(binDir, "locus-telegram");
    writeFileSync(binPath, "#!/usr/bin/env node\n");

    const resolved = resolvePackageBinary("telegram");
    expect(resolved).toBe(binPath);
  });

  it("returns the binary path when given the full scoped name", () => {
    const dir = getPackagesDir();
    const binDir = join(dir, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const binPath = join(binDir, "locus-telegram");
    writeFileSync(binPath, "#!/usr/bin/env node\n");

    const resolved = resolvePackageBinary("@locusai/locus-telegram");
    expect(resolved).toBe(binPath);
  });

});

// ─── normalizePackageName ─────────────────────────────────────────────────────

describe("normalizePackageName", () => {
  it("converts a short name to the full scoped name", () => {
    expect(normalizePackageName("telegram")).toBe("@locusai/locus-telegram");
  });

  it("passes through a fully scoped @locusai name unchanged", () => {
    expect(normalizePackageName("@locusai/locus-telegram")).toBe(
      "@locusai/locus-telegram"
    );
  });

  it("does not double-prefix an already-scoped name", () => {
    expect(normalizePackageName("@locusai/locus-telegram")).toBe(
      "@locusai/locus-telegram"
    );
  });
});

// ─── extractShortName ────────────────────────────────────────────────────────

describe("extractShortName", () => {
  it("extracts short name from scoped package", () => {
    expect(extractShortName("@locusai/locus-telegram")).toBe("telegram");
  });

  it("returns the input unchanged if no prefix matches", () => {
    expect(extractShortName("some-other-pkg")).toBe("some-other-pkg");
  });
});
