/**
 * Tests for the plan command's output parser.
 */
import { describe, expect, it } from "bun:test";
import { parsePlanArgs, parsePlanOutput } from "../src/commands/plan.js";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("parsePlanOutput", () => {
  it("parses a single well-formed issue", () => {
    const output = `Some preamble text.

---ISSUE---
ORDER: 1
TITLE: Set up database schema
PRIORITY: high
TYPE: feature
DEPENDS_ON: none
BODY:
Create the initial database schema with user and session tables.

Acceptance criteria:
- Schema file exists
- Migrations run successfully
---END---`;

    const result = parsePlanOutput(output);
    expect(result.length).toBe(1);
    expect(result[0].order).toBe(1);
    expect(result[0].title).toBe("Set up database schema");
    expect(result[0].priority).toBe("high");
    expect(result[0].type).toBe("feature");
    expect(result[0].dependsOn).toBe("none");
    expect(result[0].body).toContain("database schema");
  });

  it("parses multiple issues in order", () => {
    const output = `---ISSUE---
ORDER: 1
TITLE: First task
PRIORITY: high
TYPE: feature
DEPENDS_ON: none
BODY:
First body
---END---

---ISSUE---
ORDER: 2
TITLE: Second task
PRIORITY: medium
TYPE: chore
DEPENDS_ON: 1
BODY:
Second body
---END---

---ISSUE---
ORDER: 3
TITLE: Third task
PRIORITY: low
TYPE: docs
DEPENDS_ON: 1, 2
BODY:
Third body
---END---`;

    const result = parsePlanOutput(output);
    expect(result.length).toBe(3);
    expect(result[0].title).toBe("First task");
    expect(result[1].title).toBe("Second task");
    expect(result[2].title).toBe("Third task");
    expect(result[2].dependsOn).toBe("1, 2");
  });

  it("handles missing ORDER — assigns sequential", () => {
    const output = `---ISSUE---
TITLE: No order task 1
PRIORITY: medium
TYPE: feature
DEPENDS_ON: none
BODY:
Body 1
---END---

---ISSUE---
TITLE: No order task 2
PRIORITY: medium
TYPE: feature
DEPENDS_ON: none
BODY:
Body 2
---END---`;

    const result = parsePlanOutput(output);
    expect(result.length).toBe(2);
    expect(result[0].order).toBe(1);
    expect(result[1].order).toBe(2);
  });

  it("handles missing fields with defaults", () => {
    const output = `---ISSUE---
ORDER: 1
TITLE: Minimal issue
---END---`;

    const result = parsePlanOutput(output);
    expect(result.length).toBe(1);
    expect(result[0].priority).toBe("medium");
    expect(result[0].type).toBe("feature");
    expect(result[0].dependsOn).toBe("none");
    expect(result[0].body).toBe("");
  });

  it("skips blocks without a TITLE", () => {
    const output = `---ISSUE---
ORDER: 1
PRIORITY: high
BODY:
No title here
---END---

---ISSUE---
ORDER: 2
TITLE: Has a title
PRIORITY: medium
TYPE: feature
DEPENDS_ON: none
BODY:
Valid issue
---END---`;

    const result = parsePlanOutput(output);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Has a title");
  });

  it("returns empty array for no structured output", () => {
    const output =
      "The AI said some stuff but did not produce any structured issues.";
    const result = parsePlanOutput(output);
    expect(result.length).toBe(0);
  });

  it("handles missing ---END--- delimiter", () => {
    const output = `---ISSUE---
ORDER: 1
TITLE: No end delimiter
PRIORITY: high
TYPE: bug
DEPENDS_ON: none
BODY:
This issue has no end marker`;

    const result = parsePlanOutput(output);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("No end delimiter");
  });

  it("sorts issues by order even if output is unordered", () => {
    const output = `---ISSUE---
ORDER: 3
TITLE: Third
---END---
---ISSUE---
ORDER: 1
TITLE: First
---END---
---ISSUE---
ORDER: 2
TITLE: Second
---END---`;

    const result = parsePlanOutput(output);
    expect(result[0].title).toBe("First");
    expect(result[1].title).toBe("Second");
    expect(result[2].title).toBe("Third");
  });

  it("handles multiline body content", () => {
    const output = `---ISSUE---
ORDER: 1
TITLE: Complex body
PRIORITY: high
TYPE: feature
DEPENDS_ON: none
BODY:
Line 1 of the body.

Line 2 with a blank line above.

## Acceptance Criteria
- Criterion 1
- Criterion 2
- Criterion 3
---END---`;

    const result = parsePlanOutput(output);
    expect(result[0].body).toContain("Line 1");
    expect(result[0].body).toContain("Acceptance Criteria");
    expect(result[0].body).toContain("Criterion 3");
  });

  it("strips ansi/control artifacts while preserving markdown body content", () => {
    const output = `---ISSUE---
\u001b[36mORDER:\u001b[0m 1
TITLE: \u001b[32mFix planner issue descriptions\u001b[0m
PRIORITY: high
TYPE: feature
DEPENDS_ON: none
BODY:
\u001b[2m## Acceptance Criteria\u001b[0m
- Preserve \`inline code\`
- Keep [links](https://example.com)
\uFFFD[32m
---END---`;

    const result = parsePlanOutput(output);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Fix planner issue descriptions");
    expect(result[0].body).toContain("## Acceptance Criteria");
    expect(result[0].body).toContain("- Preserve `inline code`");
    expect(result[0].body).toContain("[links](https://example.com)");
    expect(result[0].body).not.toContain("\u001b[");
    expect(result[0].body).not.toContain("\uFFFD[");
  });
});

describe("parsePlanArgs", () => {
  it("returns a sprint name when --sprint has a value", () => {
    const result = parsePlanArgs([
      "Add more tests",
      "--sprint",
      "Sprint 7",
      "--dry-run",
    ]);

    expect(result.error).toBeUndefined();
    expect(result.directive).toBe("Add more tests");
    expect(result.sprintName).toBe("Sprint 7");
    expect(result.dryRun).toBeTrue();
  });

  it("returns an error when --sprint is missing its value", () => {
    const result = parsePlanArgs(["Add more tests", "--sprint"]);

    expect(result.error).toContain("--sprint requires a sprint name");
  });

  it("returns an error when --sprint is followed by another flag", () => {
    const result = parsePlanArgs(["Add more tests", "--sprint", "--dry-run"]);

    expect(result.error).toContain("--sprint requires a sprint name");
  });
});
