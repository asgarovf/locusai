import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Logger } from "../src/core/logger.js";

const TEST_DIR = join(tmpdir(), `locus-test-logger-${Date.now()}`);
const LOG_DIR = join(TEST_DIR, "logs");

describe("Logger", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("creates logger with default level", () => {
      const logger = new Logger();
      expect(logger.getLevel()).toBe("normal");
      logger.destroy();
    });

    it("creates logger with custom level", () => {
      const logger = new Logger({ level: "debug" });
      expect(logger.getLevel()).toBe("debug");
      logger.destroy();
    });

    it("creates log directory when logDir specified", () => {
      const logger = new Logger({ logDir: LOG_DIR });
      expect(existsSync(LOG_DIR)).toBe(true);
      logger.destroy();
    });

    it("creates log file when logDir specified", () => {
      const logger = new Logger({ logDir: LOG_DIR });
      expect(logger.getLogFile()).toBeTruthy();
      expect(logger.getLogFile()?.startsWith(LOG_DIR)).toBe(true);
      logger.destroy();
    });
  });

  describe("logging and file output", () => {
    it("writes NDJSON entries to log file", () => {
      const logger = new Logger({ logDir: LOG_DIR, level: "debug" });
      logger.info("Test message");
      logger.flush();

      const logFile = logger.getLogFile();
      expect(logFile).toBeTruthy();

      const content = readFileSync(logFile!, "utf-8").trim();
      const entry = JSON.parse(content);
      expect(entry.msg).toBe("Test message");
      expect(entry.level).toBe("info");
      expect(entry.ts).toBeTruthy();

      logger.destroy();
    });

    it("respects log level hierarchy", () => {
      const logger = new Logger({ logDir: LOG_DIR, level: "normal" });
      logger.info("shown");
      logger.debug("hidden"); // debug > normal, so this shouldn't log
      logger.flush();

      const content = readFileSync(logger.getLogFile()!, "utf-8").trim();
      const lines = content.split("\n").filter(Boolean);
      expect(lines.length).toBe(1);
      expect(JSON.parse(lines[0]).msg).toBe("shown");

      logger.destroy();
    });

    it("redacts sensitive data in file output", () => {
      const logger = new Logger({ logDir: LOG_DIR, level: "debug" });
      logger.info("Token: ghp_abcdefghijklmnopqrstuvwxyz1234567890");
      logger.flush();

      const content = readFileSync(logger.getLogFile()!, "utf-8").trim();
      expect(content).not.toContain("ghp_");
      expect(content).toContain("[REDACTED]");

      logger.destroy();
    });

    it("redacts API keys", () => {
      const logger = new Logger({ logDir: LOG_DIR, level: "debug" });
      logger.info(
        "api_key = sk-verysecretkeythatislongenough12345678901234567890"
      );
      logger.flush();

      const content = readFileSync(logger.getLogFile()!, "utf-8").trim();
      expect(content).not.toContain("sk-");
      expect(content).toContain("[REDACTED]");

      logger.destroy();
    });
  });

  describe("setLevel", () => {
    it("changes log level dynamically", () => {
      const logger = new Logger({ logDir: LOG_DIR, level: "normal" });
      expect(logger.getLevel()).toBe("normal");

      logger.setLevel("debug");
      expect(logger.getLevel()).toBe("debug");

      logger.destroy();
    });
  });

  describe("destroy", () => {
    it("flushes and cleans up", () => {
      const logger = new Logger({ logDir: LOG_DIR, level: "debug" });
      logger.info("Before destroy");
      logger.destroy();

      // Verify it was flushed
      const content = readFileSync(logger.getLogFile()!, "utf-8").trim();
      expect(content).toContain("Before destroy");
    });
  });

  describe("pruning", () => {
    it("prunes logs beyond maxFiles", () => {
      // Create more than maxFiles log files
      mkdirSync(LOG_DIR, { recursive: true });
      for (let i = 0; i < 5; i++) {
        const fn = `locus-2026-01-0${i + 1}T00-00-00.log`;
        const content = JSON.stringify({
          ts: new Date().toISOString(),
          level: "info",
          msg: `log ${i}`,
        });
        const fs = require("node:fs");
        fs.writeFileSync(join(LOG_DIR, fn), content);
      }

      // Create logger with maxFiles=3 — should prune oldest
      const logger = new Logger({ logDir: LOG_DIR, maxFiles: 3 });

      // The logger creates 1 new file + keeps up to maxFiles total
      const logFiles = readdirSync(LOG_DIR).filter(
        (f) => f.startsWith("locus-") && f.endsWith(".log")
      );
      expect(logFiles.length).toBeLessThanOrEqual(4); // 3 max + 1 new

      logger.destroy();
    });
  });
});
