import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { NextFunction, Request, Response } from "express";

export interface DocNode {
  type: "file" | "directory";
  name: string;
  path: string;
  children?: DocNode[];
}

export class DocController {
  constructor(private config: { repoPath: string; docsPath: string }) {}

  getAll = (_req: Request, res: Response, next: NextFunction) => {
    try {
      const locusDir = join(this.config.repoPath, ".locus");
      const docsFile = join(locusDir, "docs.json");

      if (!existsSync(docsFile)) {
        return res.json([]);
      }

      const docs = JSON.parse(readFileSync(docsFile, "utf-8"));
      res.json(docs);
    } catch (err) {
      next(err);
    }
  };

  getTree = (_req: Request, res: Response, next: NextFunction) => {
    try {
      if (!existsSync(this.config.docsPath)) {
        return res.json([]);
      }
      const tree = this.buildTree(this.config.docsPath);
      res.json(tree);
    } catch (err) {
      next(err);
    }
  };

  read = (req: Request, res: Response, next: NextFunction) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: { message: "Path is required" } });
      }

      const fullPath = join(this.config.docsPath, filePath);
      if (!fullPath.startsWith(this.config.docsPath)) {
        return res.status(403).json({ error: { message: "Invalid path" } });
      }

      const content = readFileSync(fullPath, "utf-8");
      res.json({ content });
    } catch (err) {
      next(err);
    }
  };

  write = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { path: filePath, content } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: { message: "Path is required" } });
      }

      const fullPath = join(this.config.docsPath, filePath);
      if (!fullPath.startsWith(this.config.docsPath)) {
        return res.status(403).json({ error: { message: "Invalid path" } });
      }

      // Ensure parent directory exists
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  };

  private buildTree(dir: string, basePath: string = ""): DocNode[] {
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
          children: this.buildTree(fullPath, relativePath),
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
}
