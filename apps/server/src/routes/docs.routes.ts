import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Router } from "express";

interface DocNode {
  type: "file" | "directory";
  name: string;
  path: string;
  children?: DocNode[];
}

export function createDocsRouter(config: { docsPath: string }) {
  const router = Router();

  router.get("/tree", async (_req, res) => {
    const scan = async (dir: string): Promise<DocNode[]> => {
      const entries = await readdir(dir, { withFileTypes: true });
      const results = [];
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath
          .replace(config.docsPath, "")
          .replace(/^\//, "");
        if (entry.isDirectory()) {
          results.push({
            type: "directory",
            name: entry.name,
            path: relativePath,
            children: await scan(fullPath),
          } as DocNode);
        } else {
          results.push({
            type: "file",
            name: entry.name,
            path: relativePath,
          } as DocNode);
        }
      }
      return results;
    };
    try {
      const tree = await scan(config.docsPath);
      res.json(tree);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: { message } });
    }
  });

  router.get("/read", async (req, res) => {
    const docPath = req.query.path as string;
    const fullPath = resolve(config.docsPath, docPath);
    if (!fullPath.startsWith(config.docsPath))
      return res.status(403).json({ error: { message: "Access denied" } });
    try {
      const content = readFileSync(fullPath, "utf-8");
      res.json({ content });
    } catch (_err: unknown) {
      res.status(404).json({ error: { message: "File not found" } });
    }
  });

  router.post("/write", async (req, res) => {
    try {
      const { path: docPath, content } = req.body;
      const fullPath = resolve(config.docsPath, docPath);
      if (!fullPath.startsWith(config.docsPath)) {
        return res.status(403).json({ error: { message: "Access denied" } });
      }
      const { writeFile, mkdir } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
      res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Doc write error:", err);
      res.status(500).json({ error: { message } });
    }
  });

  return router;
}
