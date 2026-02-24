import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildExecutionPrompt,
  buildFeedbackPrompt,
  buildReplPrompt,
} from "../src/core/prompt-builder.js";
import type { Issue, LocusConfig } from "../src/types.js";

const TEST_DIR = join(tmpdir(), `locus-test-prompt-${Date.now()}`);

const mockIssue: Issue = {
  number: 42,
  title: "Add dark mode",
  body: "Implement dark mode toggle in settings page.",
  state: "open",
  labels: ["p:high", "type:feature"],
  milestone: "Sprint 1",
  assignees: ["alice"],
  url: "https://github.com/test/repo/issues/42",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

const mockConfig: LocusConfig = {
  version: "3.0.0",
  github: { owner: "test", repo: "repo", defaultBranch: "main" },
  ai: { provider: "claude", model: "opus" },
  agent: {
    maxParallel: 3,
    autoLabel: true,
    autoPR: true,
    baseBranch: "main",
    rebaseBeforeTask: true,
  },
  sprint: { active: null, stopOnFailure: true },
  logging: { level: "normal", maxFiles: 20, maxTotalSizeMB: 50 },
};

describe("prompt-builder", () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, ".locus"), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("buildExecutionPrompt", () => {
    it("includes issue title and body", () => {
      const prompt = buildExecutionPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
      });
      expect(prompt).toContain("Add dark mode");
      expect(prompt).toContain("Implement dark mode toggle in settings page.");
    });

    it("includes issue number", () => {
      const prompt = buildExecutionPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
      });
      expect(prompt).toContain("#42");
    });

    it("includes labels", () => {
      const prompt = buildExecutionPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
      });
      expect(prompt).toContain("p:high");
      expect(prompt).toContain("type:feature");
    });

    it("includes execution rules", () => {
      const prompt = buildExecutionPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
      });
      expect(prompt).toContain("Execution Rules");
      expect(prompt).toContain("conventional commits");
    });

    it("includes sprint context when provided", () => {
      const prompt = buildExecutionPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
        sprintName: "Sprint 1",
        sprintPosition: "2 of 5",
        sprintContext: "+added some code",
      });
      expect(prompt).toContain("Sprint Context");
      expect(prompt).toContain("Sprint 1");
      expect(prompt).toContain("2 of 5");
      expect(prompt).toContain("+added some code");
    });

    it("includes LOCUS.md when present", () => {
      writeFileSync(
        join(TEST_DIR, "LOCUS.md"),
        "# Project Rules\nUse TypeScript."
      );
      const prompt = buildExecutionPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
      });
      expect(prompt).toContain("Project Rules");
      expect(prompt).toContain("Use TypeScript");
    });

    it("includes LEARNINGS.md when present", () => {
      writeFileSync(
        join(TEST_DIR, ".locus", "LEARNINGS.md"),
        "- Always use bun for builds"
      );
      const prompt = buildExecutionPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
      });
      expect(prompt).toContain("Always use bun for builds");
    });

    it("includes issue comments when provided", () => {
      const prompt = buildExecutionPrompt({
        issue: mockIssue,
        issueComments: ["reviewer: Please also update tests"],
        config: mockConfig,
        projectRoot: TEST_DIR,
      });
      expect(prompt).toContain("Please also update tests");
    });
  });

  describe("buildFeedbackPrompt", () => {
    it("includes PR diff", () => {
      const prompt = buildFeedbackPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
        prDiff: "+function newFeature() {}",
        prComments: [],
        prNumber: 99,
      });
      expect(prompt).toContain("PR #99");
      expect(prompt).toContain("+function newFeature() {}");
    });

    it("includes review comments", () => {
      const prompt = buildFeedbackPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
        prDiff: "+code",
        prComments: ["Please add error handling here"],
        prNumber: 99,
      });
      expect(prompt).toContain("Please add error handling here");
    });

    it("includes feedback instructions", () => {
      const prompt = buildFeedbackPrompt({
        issue: mockIssue,
        config: mockConfig,
        projectRoot: TEST_DIR,
        prDiff: "+code",
        prComments: [],
        prNumber: 99,
      });
      expect(prompt).toContain("Address ALL review feedback");
    });
  });

  describe("buildReplPrompt", () => {
    it("includes user message", () => {
      const prompt = buildReplPrompt(
        "How do I fix this bug?",
        TEST_DIR,
        mockConfig
      );
      expect(prompt).toContain("How do I fix this bug?");
    });

    it("includes LOCUS.md context", () => {
      writeFileSync(join(TEST_DIR, "LOCUS.md"), "# My Project\nBe concise.");
      const prompt = buildReplPrompt("hello", TEST_DIR, mockConfig);
      expect(prompt).toContain("My Project");
      expect(prompt).toContain("Be concise");
    });
  });
});
