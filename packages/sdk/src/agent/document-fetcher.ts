import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LogFn } from "../ai/factory.js";
import { getLocusPath } from "../core/config.js";
import type { LocusClient } from "../index.js";

export interface DocumentFetcherDeps {
  client: LocusClient;
  workspaceId: string;
  projectPath: string;
  log: LogFn;
}

/**
 * Fetches documents from the platform to local storage.
 * One-way sync: server -> local only.
 * Artifacts are NOT synced to cloud (they remain local-only).
 */
export class DocumentFetcher {
  constructor(private deps: DocumentFetcherDeps) {}

  /**
   * Fetches documents from the server and saves them locally.
   * Documents are organized by group name in .locus/documents/{groupName}/
   */
  async fetch(): Promise<void> {
    const documentsDir = getLocusPath(this.deps.projectPath, "documentsDir");

    // Ensure documents directory exists
    if (!existsSync(documentsDir)) {
      mkdirSync(documentsDir, { recursive: true });
    }

    try {
      // Get all groups to map IDs to names
      const groups = await this.deps.client.docs.listGroups(
        this.deps.workspaceId
      );
      const groupMap = new Map(groups.map((g) => [g.id, g.name]));

      // Get all docs from server
      const docs = await this.deps.client.docs.list(this.deps.workspaceId);

      // Filter out artifacts (we don't sync those)
      const artifactsGroupId = groups.find((g) => g.name === "Artifacts")?.id;

      let fetchedCount = 0;

      for (const doc of docs) {
        // Skip artifacts - they are local-only
        if (doc.groupId === artifactsGroupId) {
          continue;
        }

        // Get group name for folder structure
        const groupName = groupMap.get(doc.groupId || "") || "General";
        const groupDir = join(documentsDir, groupName);

        if (!existsSync(groupDir)) {
          mkdirSync(groupDir, { recursive: true });
        }

        const fileName = `${doc.title}.md`;
        const filePath = join(groupDir, fileName);

        // Update local docs to match server (one-way sync)
        if (
          !existsSync(filePath) ||
          readFileSync(filePath, "utf-8") !== doc.content
        ) {
          writeFileSync(filePath, doc.content || "");
          fetchedCount++;
        }
      }

      if (fetchedCount > 0) {
        this.deps.log(
          `Fetched ${fetchedCount} document(s) from server`,
          "info"
        );
      }
    } catch (error) {
      this.deps.log(`Failed to fetch documents: ${error}`, "error");
    }
  }
}
