import { describe, expect, it } from "bun:test";
import {
  findMilestoneByTitle,
  normalizeMilestoneTitle,
} from "../src/commands/sprint.js";
import type { Milestone } from "../src/types.js";

describe("sprint milestone matching", () => {
  const milestones: Milestone[] = [
    {
      number: 10,
      title: "Sprint Alpha",
      description: "",
      state: "open",
      dueOn: null,
      openIssues: 3,
      closedIssues: 1,
    },
    {
      number: 11,
      title: "Release Hardening",
      description: "",
      state: "closed",
      dueOn: null,
      openIssues: 0,
      closedIssues: 5,
    },
  ];

  it("normalizes titles using trim + lowercase", () => {
    expect(normalizeMilestoneTitle("  Sprint Alpha  ")).toBe("sprint alpha");
  });

  it("finds a milestone regardless of case and extra spaces", () => {
    const found = findMilestoneByTitle(milestones, "  sprint ALPHA ");

    expect(found).toBeDefined();
    expect(found?.number).toBe(10);
  });

  it("returns undefined when there is no title match", () => {
    const found = findMilestoneByTitle(milestones, "Sprint Beta");

    expect(found).toBeUndefined();
  });
});
