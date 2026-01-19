/**
 * Doc Service
 *
 * Handles documentation storage with dual-mode support:
 * - Local mode: Uses file system (for local development)
 * - Cloud mode: Uses database (for production deployment)
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import type { Document } from "../db/schema.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../lib/errors.js";
import type { DocumentRepository } from "../repositories/document.repository.js";

export interface DocNode {
  type: "file" | "directory";
  name: string;
  path: string;
  children?: DocNode[];
}

interface DocServiceLocalConfig {
  repoPath: string;
  docsPath: string;
}

/**
 * DocService - Supports both file-based (local) and database-based (cloud) storage
 */
export class DocService {
  private isCloud: boolean;
  private documentRepo?: DocumentRepository;
  private localConfig?: DocServiceLocalConfig;

  /**
   * Constructor for Local mode (file-based storage)
   */
  constructor(config: DocServiceLocalConfig);
  /**
   * Constructor for Cloud mode (database storage)
   */
  constructor(documentRepo: DocumentRepository);
  constructor(configOrRepo: DocServiceLocalConfig | DocumentRepository) {
    if ("findByProjectId" in configOrRepo) {
      // Cloud mode
      this.isCloud = true;
      this.documentRepo = configOrRepo as DocumentRepository;
    } else {
      // Local mode
      this.isCloud = false;
      this.localConfig = configOrRepo as DocServiceLocalConfig;
    }
  }

  /**
   * Get all registered docs
   * - Local: reads from docs.json file
   * - Cloud: returns all documents from database for the project
   */
  async getAll(projectId?: string): Promise<unknown[]> {
    if (this.isCloud) {
      if (!projectId) {
        throw new BadRequestError("projectId is required in cloud mode");
      }
      return this.getAllCloud(projectId);
    }
    return this.getAllLocal();
  }

  /**
   * Build a file tree of the documentation
   * - Local: scans the file system
   * - Cloud: builds a virtual tree from database paths
   */
  async getTree(projectId?: string): Promise<DocNode[]> {
    if (this.isCloud) {
      if (!projectId) {
        throw new BadRequestError("projectId is required in cloud mode");
      }
      return this.getTreeCloud(projectId);
    }
    return this.getTreeLocal();
  }

  /**
   * Read document content
   * - Local: reads from file system
   * - Cloud: reads from database
   */
  async read(filePath: string, projectId?: string): Promise<string> {
    if (!filePath) {
      throw new BadRequestError("Path is required");
    }

    if (this.isCloud) {
      if (!projectId) {
        throw new BadRequestError("projectId is required in cloud mode");
      }
      return this.readCloud(filePath, projectId);
    }
    return this.readLocal(filePath);
  }

  /**
   * Write document content
   * - Local: writes to file system
   * - Cloud: upserts in database
   */
  async write(
    filePath: string,
    content: string,
    userId?: string,
    projectId?: string
  ): Promise<void> {
    if (!filePath) {
      throw new BadRequestError("Path is required");
    }

    if (this.isCloud) {
      if (!projectId || !userId) {
        throw new BadRequestError(
          "projectId and userId are required in cloud mode"
        );
      }
      return this.writeCloud(filePath, content, userId, projectId);
    }
    return this.writeLocal(filePath, content);
  }

  // ============================================================================
  // Local Mode Implementation (File System)
  // ============================================================================

  private async getAllLocal(): Promise<unknown[]> {
    if (!this.localConfig) throw new Error("Local config missing");
    const locusDir = join(this.localConfig.repoPath, ".locus");
    const docsFile = join(locusDir, "docs.json");

    if (!existsSync(docsFile)) {
      return [];
    }

    try {
      return JSON.parse(readFileSync(docsFile, "utf-8"));
    } catch (err) {
      console.error("[DocService] Failed to parse docs.json:", err);
      return [];
    }
  }

  private async getTreeLocal(): Promise<DocNode[]> {
    if (!this.localConfig) throw new Error("Local config missing");
    if (!existsSync(this.localConfig.docsPath)) {
      return [];
    }
    return this.buildTreeFromFileSystem(this.localConfig.docsPath);
  }

  private async readLocal(filePath: string): Promise<string> {
    const fullPath = this.resolveSafePath(filePath);

    if (!existsSync(fullPath)) {
      throw new NotFoundError("Document");
    }

    return readFileSync(fullPath, "utf-8");
  }

  private async writeLocal(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolveSafePath(filePath);

    // Ensure parent directory exists
    mkdirSync(dirname(fullPath), { recursive: true });

    writeFileSync(fullPath, content, "utf-8");
  }

  private resolveSafePath(filePath: string): string {
    if (!this.localConfig) throw new Error("Local config missing");
    const fullPath = join(this.localConfig.docsPath, filePath);
    if (!fullPath.startsWith(this.localConfig.docsPath)) {
      throw new ForbiddenError(
        "Access outside documentation directory is not allowed"
      );
    }
    return fullPath;
  }

  private buildTreeFromFileSystem(
    dir: string,
    basePath: string = ""
  ): DocNode[] {
    const entries = readdirSync(dir);
    const nodes: DocNode[] = [];

    for (const entry of entries) {
      if (entry.startsWith(".")) continue;

      const fullPath = join(dir, entry);
      const relativePath = join(basePath, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        nodes.push({
          type: "directory",
          name: entry,
          path: relativePath,
          children: this.buildTreeFromFileSystem(fullPath, relativePath),
        });
      } else {
        nodes.push({
          type: "file",
          name: entry,
          path: relativePath,
        });
      }
    }

    return nodes;
  }

  // ============================================================================
  // Cloud Mode Implementation (Database)
  // ============================================================================

  private async getAllCloud(projectId: string): Promise<Document[]> {
    if (!this.documentRepo) {
      throw new Error("Cloud mode not properly configured");
    }

    return this.documentRepo.findByProjectId(projectId);
  }

  private async getTreeCloud(projectId: string): Promise<DocNode[]> {
    if (!this.documentRepo) {
      throw new Error("Cloud mode not properly configured");
    }

    const documents = await this.documentRepo.findByProjectId(projectId);

    return this.buildTreeFromDocuments(documents);
  }

  private async readCloud(
    filePath: string,
    projectId: string
  ): Promise<string> {
    if (!this.documentRepo) {
      throw new Error("Cloud mode not properly configured");
    }

    const document = await this.documentRepo.findByPath(projectId, filePath);

    if (!document) {
      throw new NotFoundError("Document");
    }

    return document.content;
  }

  private async writeCloud(
    filePath: string,
    content: string,
    userId: string,
    projectId: string
  ): Promise<void> {
    if (!this.documentRepo) {
      throw new Error("Cloud mode not properly configured");
    }

    // Extract title from filename
    const title = this.extractTitleFromPath(filePath);

    await this.documentRepo.upsertByPath(projectId, filePath, {
      title,
      content,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Build a virtual tree structure from flat document paths
   */
  private buildTreeFromDocuments(documents: Document[]): DocNode[] {
    const root: DocNode[] = [];
    const directoryMap = new Map<string, DocNode>();

    // Sort by path to ensure parent directories are processed first
    const sortedDocs = [...documents].sort((a, b) =>
      a.path.localeCompare(b.path)
    );

    for (const doc of sortedDocs) {
      const pathParts = doc.path.split("/").filter(Boolean);

      if (pathParts.length === 1) {
        // Root-level file
        root.push({
          type: "file",
          name: pathParts[0],
          path: doc.path,
        });
      } else {
        // Nested file - ensure parent directories exist
        let currentPath = "";
        let currentChildren = root;

        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          let dirNode = directoryMap.get(currentPath);
          if (!dirNode) {
            dirNode = {
              type: "directory",
              name: part,
              path: currentPath,
              children: [],
            };
            directoryMap.set(currentPath, dirNode);
            currentChildren.push(dirNode);
          }

          if (!dirNode.children) {
            dirNode.children = [];
          }
          currentChildren = dirNode.children;
        }

        // Add file to its parent directory
        currentChildren.push({
          type: "file",
          name: pathParts[pathParts.length - 1],
          path: doc.path,
        });
      }
    }

    return root;
  }

  /**
   * Extract a readable title from file path
   */
  private extractTitleFromPath(path: string): string {
    const filename = basename(path);
    // Remove extension and convert dashes/underscores to spaces
    return filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
