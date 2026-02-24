import { describe, expect, it } from "bun:test";
import { parseRemoteUrl } from "../src/core/context.js";

describe("context", () => {
  describe("parseRemoteUrl", () => {
    it("parses SSH URL", () => {
      const result = parseRemoteUrl("git@github.com:owner/repo.git");
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });

    it("parses HTTPS URL", () => {
      const result = parseRemoteUrl("https://github.com/myorg/myrepo.git");
      expect(result.owner).toBe("myorg");
      expect(result.repo).toBe("myrepo");
    });

    it("parses HTTPS URL without .git suffix", () => {
      const result = parseRemoteUrl("https://github.com/myorg/myrepo");
      expect(result.owner).toBe("myorg");
      expect(result.repo).toBe("myrepo");
    });

    it("parses shorthand owner/repo", () => {
      const result = parseRemoteUrl("owner/repo");
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });

    it("returns empty strings for unrecognized format", () => {
      const result = parseRemoteUrl("not-a-url");
      expect(result.owner).toBe("");
      expect(result.repo).toBe("");
    });

    it("handles SSH URL with dashes in owner and repo", () => {
      const result = parseRemoteUrl("git@github.com:my-org/my-repo.git");
      expect(result.owner).toBe("my-org");
      expect(result.repo).toBe("my-repo");
    });

    it("handles HTTPS URL with port (rare but valid)", () => {
      const result = parseRemoteUrl("https://github.com/owner/repo");
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });
  });
});
