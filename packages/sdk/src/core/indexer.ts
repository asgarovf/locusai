import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { globby } from "globby";

export interface CodebaseIndex {
  symbols: Record<string, string[]>; // symbol -> file paths
  responsibilities: Record<string, string>; // file path -> brief summary
  lastIndexed: string;
}

export class CodebaseIndexer {
  private projectPath: string;
  private indexPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.indexPath = join(projectPath, ".locus", "codebase-index.json");
  }

  /**
   * Generates a codebase index by providing the entire file tree to an AI summarizer.
   * This is much more efficient than per-file indexing for large projects.
   */
  async index(
    onProgress?: (message: string) => void,
    treeSummarizer?: (tree: string) => Promise<CodebaseIndex>
  ): Promise<CodebaseIndex> {
    if (!treeSummarizer) {
      throw new Error("A treeSummarizer is required for this indexing method.");
    }

    if (onProgress) onProgress("Generating file tree...");

    // 1. Get a comprehensive but clean file tree
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

    const files = await globby(["**/*"], {
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

    // Format the tree for the AI
    const treeString = files.join("\n");

    if (onProgress) onProgress("AI is analyzing codebase structure...");

    // 2. Ask AI to generate the index based on the tree
    const index = await treeSummarizer(treeString);

    // 3. Post-process: Ensure symbols are extracted for core files if not provided by AI
    // (AI is good at structure, but might miss specific exports unless it reads the files)
    // For now, we trust the AI's structural summary and can supplement symbols later if needed.

    index.lastIndexed = new Date().toISOString();
    return index;
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
}
