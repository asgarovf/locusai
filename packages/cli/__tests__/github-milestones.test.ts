import { describe, expect, it } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const originalPath = process.env.PATH ?? "";
const packageDir = join(import.meta.dir, "..");

describe("listMilestones", () => {
  it("passes milestone query params as a single gh api endpoint argument", () => {
    const fakeBinDir = mkdtempSync(join(tmpdir(), "locus-gh-test-"));

    try {
      const fakeGhPath = join(fakeBinDir, "gh");
      const expectedEndpoint =
        "repos/acme/project/milestones?state=open&sort=due_on&direction=asc&per_page=100&page=1";

      writeFileSync(
        fakeGhPath,
        `#!/bin/sh
if [ "$1" = "api" ] && [ "$2" = "${expectedEndpoint}" ]; then
  printf '[{"number":12,"title":"Sprint 12","description":"","state":"open","due_on":null,"open_issues":3,"closed_issues":1}]'
  exit 0
fi
printf '[]'
`,
        "utf-8"
      );
      chmodSync(fakeGhPath, 0o755);

      const result = Bun.spawnSync({
        cmd: [
          "bun",
          "--eval",
          `import { listMilestones } from ${JSON.stringify(join(packageDir, "src/core/github.ts"))}; const milestones = listMilestones("acme", "project", "open", { cwd: ${JSON.stringify(packageDir)} }); process.stdout.write(JSON.stringify(milestones));`,
        ],
        cwd: packageDir,
        env: {
          ...process.env,
          PATH: `${fakeBinDir}:${originalPath}`,
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(result.exitCode).toBe(0);
      const milestones = JSON.parse(
        Buffer.from(result.stdout).toString("utf-8")
      );

      expect(milestones).toHaveLength(1);
      expect(milestones[0]).toEqual({
        number: 12,
        title: "Sprint 12",
        description: "",
        state: "open",
        dueOn: null,
        openIssues: 3,
        closedIssues: 1,
      });
    } finally {
      rmSync(fakeBinDir, { recursive: true, force: true });
    }
  });
});
