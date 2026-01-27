import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { DocType } from "@locusai/shared";
import type { LogFn } from "../ai/factory.js";
import { getLocusPath } from "../core/config.js";
import type { LocusClient } from "../index.js";

export interface ArtifactSyncerDeps {
  client: LocusClient;
  workspaceId: string;
  projectPath: string;
  log: LogFn;
}

/**
 * Handles syncing local artifacts to the platform
 */
export class ArtifactSyncer {
  constructor(private deps: ArtifactSyncerDeps) {}

  private async getOrCreateArtifactsGroup(): Promise<string> {
    try {
      const groups = await this.deps.client.docs.listGroups(
        this.deps.workspaceId
      );
      const artifactsGroup = groups.find((g) => g.name === "Artifacts");

      if (artifactsGroup) {
        return artifactsGroup.id;
      }

      // Create the Artifacts group
      const newGroup = await this.deps.client.docs.createGroup(
        this.deps.workspaceId,
        {
          name: "Artifacts",
          order: 999, // Place at the end
        }
      );
      this.deps.log(
        "Created 'Artifacts' group for agent-generated docs",
        "info"
      );
      return newGroup.id;
    } catch (error) {
      this.deps.log(`Failed to get/create Artifacts group: ${error}`, "error");
      throw error;
    }
  }

  async sync(): Promise<void> {
    const artifactsDir = getLocusPath(this.deps.projectPath, "artifactsDir");
    if (!existsSync(artifactsDir)) {
      mkdirSync(artifactsDir, { recursive: true });
      return;
    }

    try {
      const files = readdirSync(artifactsDir);
      if (files.length === 0) return;

      this.deps.log(`Syncing ${files.length} artifacts to server...`, "info");

      // Get or create the Artifacts group
      const artifactsGroupId = await this.getOrCreateArtifactsGroup();

      // Get existing docs to check for updates
      const existingDocs = await this.deps.client.docs.list(
        this.deps.workspaceId
      );

      for (const file of files) {
        const filePath = join(artifactsDir, file);
        if (statSync(filePath).isFile()) {
          const content = readFileSync(filePath, "utf-8");
          const title = file.replace(/\.md$/, "").trim();
          if (!title) continue;

          const existing = existingDocs.find((d) => d.title === title);

          if (existing) {
            if (
              existing.content !== content ||
              existing.groupId !== artifactsGroupId
            ) {
              await this.deps.client.docs.update(
                existing.id,
                this.deps.workspaceId,
                { content, groupId: artifactsGroupId }
              );
              this.deps.log(`Updated artifact: ${file}`, "success");
            }
          } else {
            await this.deps.client.docs.create(this.deps.workspaceId, {
              title,
              content,
              groupId: artifactsGroupId,
              type: DocType.GENERAL,
            });
            this.deps.log(`Created artifact: ${file}`, "success");
          }
        }
      }
    } catch (error) {
      this.deps.log(`Failed to sync artifacts: ${error}`, "error");
    }
  }
}
