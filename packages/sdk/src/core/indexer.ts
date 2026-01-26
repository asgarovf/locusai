import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { globby } from "globby";

export interface CodebaseIndex {
  symbols: Record<string, string[]>; // symbol -> file paths
  responsibilities: Record<string, string>; // file path -> brief summary
  lastIndexed: string;
  treeHash?: string; // hash of file tree for change detection
  fileHashes?: Record<string, string>; // file path -> content hash for incremental updates
}

export class CodebaseIndexer {
  private projectPath: string;
  private indexPath: string;
  private fullReindexRatioThreshold: number = 0.2; //%20 of existing files changed

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.indexPath = join(projectPath, ".locus", "codebase-index.json");
  }

  /**
   * Generates a codebase index by providing the entire file tree to an AI summarizer.
   * Supports incremental updates - only analyzes changed files when possible.
   * Returns null if no changes detected (unless force=true).
   */
  async index(
    onProgress?: (message: string) => void,
    treeSummarizer?: (tree: string) => Promise<CodebaseIndex>,
    force = false
  ): Promise<CodebaseIndex | null> {
    if (!treeSummarizer) {
      throw new Error("A treeSummarizer is required for this indexing method.");
    }

    onProgress?.("Generating file tree...");

    // 1. Get a comprehensive but clean file tree
    const currentFiles = await this.getFileTree();
    const treeString = currentFiles.join("\n");
    const newTreeHash = this.hashTree(treeString);

    const existingIndex = this.loadIndex();

    // 2. Quick check: if tree hash matches, no file additions/deletions
    if (!force && existingIndex?.treeHash === newTreeHash) {
      onProgress?.("No file changes detected, skipping reindex");
      return null;
    }

    // 3. Compute content hashes for all current files
    onProgress?.("Computing file hashes...");
    const currentHashes = this.computeFileHashes(currentFiles);

    // 4. Check if we can do incremental update
    const existingHashes = existingIndex?.fileHashes;
    const canIncremental = !force && existingIndex && existingHashes;

    if (canIncremental) {
      const { added, deleted, modified } = this.diffFiles(
        currentHashes,
        existingHashes
      );

      const changedFiles = [...added, ...modified];
      const totalChanges = changedFiles.length + deleted.length;
      const existingFileCount = Object.keys(existingHashes).length;

      // Handle edge case: empty existing index
      if (existingFileCount === 0) {
        onProgress?.("Empty existing index, performing full reindex");
      } else {
        const changeRatio = totalChanges / existingFileCount;

        if (
          changeRatio <= this.fullReindexRatioThreshold &&
          changedFiles.length > 0
        ) {
          onProgress?.(
            `Incremental update: ${added.length} added, ${modified.length} modified, ${deleted.length} deleted`
          );

          // Analyze changed files FIRST (before mutating index)
          const incrementalIndex = await treeSummarizer(
            changedFiles.join("\n")
          );

          // Clone to avoid corrupting loaded index if something fails later
          const updatedIndex: CodebaseIndex = JSON.parse(
            JSON.stringify(existingIndex)
          );
          this.removeFilesFromIndex(updatedIndex, [...deleted, ...modified]);

          // Merge results
          return this.mergeIndex(
            updatedIndex,
            incrementalIndex,
            currentHashes,
            newTreeHash
          );
        }

        if (changedFiles.length === 0 && deleted.length > 0) {
          // Only deletions, no AI call needed
          onProgress?.(`Removing ${deleted.length} deleted files from index`);
          const updatedIndex: CodebaseIndex = JSON.parse(
            JSON.stringify(existingIndex)
          );
          this.removeFilesFromIndex(updatedIndex, deleted);
          updatedIndex.treeHash = newTreeHash;
          updatedIndex.fileHashes = currentHashes;
          updatedIndex.lastIndexed = new Date().toISOString();
          return updatedIndex;
        }

        // Log why we're falling through to full reindex
        if (totalChanges > 0) {
          onProgress?.(
            `Too many changes (${(changeRatio * 100).toFixed(1)}%), performing full reindex`
          );
        }
      }
    }

    // 5. Full reindex
    onProgress?.("AI is analyzing codebase structure...");
    const index = await treeSummarizer(treeString);
    index.lastIndexed = new Date().toISOString();
    index.treeHash = newTreeHash;
    index.fileHashes = currentHashes;
    return index;
  }

  private async getFileTree(): Promise<string[]> {
    const gitmodulesPath = join(this.projectPath, ".gitmodules");
    const submoduleIgnores: string[] = [];
    if (existsSync(gitmodulesPath)) {
      try {
        const content = readFileSync(gitmodulesPath, "utf-8");
        const lines = content.split("\n");
        for (const line of lines) {
          const match = line.match(/^\s*path\s*=\s*(.*)$/);
          const path = match?.[1]?.trim();
          if (path) {
            submoduleIgnores.push(`${path}/**`);
            submoduleIgnores.push(`**/${path}/**`);
          }
        }
      } catch {
        // Fallback if .gitmodules exists but can't be read or parsed
      }
    }

    return globby(["**/*"], {
      cwd: this.projectPath,
      gitignore: true,
      ignore: [
        ...submoduleIgnores,
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/target/**", // Rust build artifacts
        "**/bin/**",
        "**/obj/**",
        "**/.next/**",
        "**/.svelte-kit/**",
        "**/.nuxt/**",
        "**/.cache/**",
        "**/out/**",
        "**/__tests__/**",
        "**/coverage/**",
        "**/*.test.*",
        "**/*.spec.*",
        "**/*.d.ts",
        "**/tsconfig.tsbuildinfo",
        "**/.locus/*.json", // Ignore index and other system JSONs
        "**/.locus/*.md", // Ignore system MDs
        "**/.locus/!(artifacts)/**", // Ignore everything in .locus EXCEPT artifacts
        "**/.git/**",
        "**/.svn/**",
        "**/.hg/**",
        "**/.vscode/**",
        "**/.idea/**",
        "**/.DS_Store",
        "**/bun.lock",
        "**/package-lock.json",
        "**/yarn.lock",
        "**/pnpm-lock.yaml",
        "**/Cargo.lock",
        "**/go.sum",
        "**/poetry.lock",
        // Binary/Large Assets
        "**/*.{png,jpg,jpeg,gif,svg,ico,mp4,webm,wav,mp3,woff,woff2,eot,ttf,otf,pdf,zip,tar.gz,rar}",
      ],
    });
  }

  loadIndex(): CodebaseIndex | null {
    if (existsSync(this.indexPath)) {
      try {
        return JSON.parse(readFileSync(this.indexPath, "utf-8"));
      } catch {
        return null;
      }
    }
    return null;
  }

  saveIndex(index: CodebaseIndex): void {
    const dir = dirname(this.indexPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  private hashTree(tree: string): string {
    return createHash("sha256").update(tree).digest("hex");
  }

  private hashFile(filePath: string): string | null {
    try {
      const content = readFileSync(join(this.projectPath, filePath), "utf-8");
      return createHash("sha256").update(content).digest("hex").slice(0, 16);
    } catch {
      return null; // File unreadable, skip it
    }
  }

  private computeFileHashes(files: string[]): Record<string, string> {
    const hashes: Record<string, string> = {};
    for (const file of files) {
      const hash = this.hashFile(file);
      if (hash !== null) {
        hashes[file] = hash;
      }
    }
    return hashes;
  }

  private diffFiles(
    currentHashes: Record<string, string>,
    existingHashes: Record<string, string>
  ): { added: string[]; deleted: string[]; modified: string[] } {
    const currentFiles = Object.keys(currentHashes);
    const existingFiles = Object.keys(existingHashes);
    const existingSet = new Set(existingFiles);
    const currentSet = new Set(currentFiles);

    const added = currentFiles.filter((f) => !existingSet.has(f));
    const deleted = existingFiles.filter((f) => !currentSet.has(f));
    const modified = currentFiles.filter(
      (f) => existingSet.has(f) && currentHashes[f] !== existingHashes[f]
    );

    return { added, deleted, modified };
  }

  private removeFilesFromIndex(index: CodebaseIndex, files: string[]): void {
    const fileSet = new Set(files);

    // Remove from responsibilities
    for (const file of files) {
      delete index.responsibilities[file];
    }

    // Remove from symbols (filter out file paths)
    for (const [symbol, paths] of Object.entries(index.symbols)) {
      index.symbols[symbol] = paths.filter((p) => !fileSet.has(p));
      if (index.symbols[symbol].length === 0) {
        delete index.symbols[symbol];
      }
    }
  }

  private mergeIndex(
    existing: CodebaseIndex,
    incremental: CodebaseIndex,
    newHashes: Record<string, string>,
    newTreeHash: string
  ): CodebaseIndex {
    // Properly merge symbol arrays (avoid data loss)
    const mergedSymbols = { ...existing.symbols };
    for (const [symbol, paths] of Object.entries(incremental.symbols)) {
      if (mergedSymbols[symbol]) {
        // Merge and deduplicate
        mergedSymbols[symbol] = [
          ...new Set([...mergedSymbols[symbol], ...paths]),
        ];
      } else {
        mergedSymbols[symbol] = paths;
      }
    }

    return {
      symbols: mergedSymbols,
      responsibilities: {
        ...existing.responsibilities,
        ...incremental.responsibilities,
      },
      lastIndexed: new Date().toISOString(),
      treeHash: newTreeHash,
      fileHashes: newHashes,
    };
  }
}
