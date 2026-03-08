#!/usr/bin/env bun
// ---------------------------------------------------------------------------
// Generate registry.json and skills-lock.json from skills/ directory.
//
// Each skill lives in skills/<name>/SKILL.md with YAML frontmatter containing
// metadata (name, description, tags, platforms, author). This script reads
// every SKILL.md, extracts frontmatter, and writes:
//   - registry.json   (remote-compatible skill catalog)
//   - skills-lock.json (provenance + content hashes)
//
// Usage:  bun run scripts/generate-registry.ts
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SKILLS_DIR = join(ROOT, "skills");
const REGISTRY_PATH = join(ROOT, "registry.json");
const LOCK_PATH = join(ROOT, "skills-lock.json");
const REGISTRY_REPO = "locusai/skills";

// ---------------------------------------------------------------------------
// Frontmatter parser (avoids external YAML dependency)
// ---------------------------------------------------------------------------

interface SkillFrontmatter {
  name: string;
  description: string;
  tags: string[];
  platforms: string[];
  author: string;
}

function parseFrontmatter(content: string): SkillFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error("SKILL.md is missing YAML frontmatter (--- delimiters).");
  }

  const raw = match[1];
  const fields: Record<string, string> = {};

  for (const line of raw.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    fields[key] = value;
  }

  const parseArray = (val: string | undefined): string[] => {
    if (!val) return [];
    // Handle [a, b, c] YAML inline array syntax
    const inner = val.replace(/^\[/, "").replace(/\]$/, "");
    return inner
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  if (!fields.name) throw new Error("Frontmatter missing required field: name");
  if (!fields.description)
    throw new Error("Frontmatter missing required field: description");

  return {
    name: fields.name,
    description: fields.description,
    tags: parseArray(fields.tags),
    platforms: parseArray(fields.platforms),
    author: fields.author || "locusai",
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const entries = readdirSync(SKILLS_DIR).filter((name) => {
    const dir = join(SKILLS_DIR, name);
    return statSync(dir).isDirectory();
  });

  if (entries.length === 0) {
    console.error("No skill directories found in skills/");
    process.exit(1);
  }

  const registrySkills: Array<{
    name: string;
    description: string;
    tags: string[];
    platforms: string[];
    path: string;
    author: string;
  }> = [];

  const lockSkills: Record<
    string,
    { source: string; sourceType: "github"; computedHash: string }
  > = {};

  for (const skillDir of entries.sort()) {
    const skillMdPath = join(SKILLS_DIR, skillDir, "SKILL.md");

    let content: string;
    try {
      content = readFileSync(skillMdPath, "utf-8");
    } catch {
      console.warn(`  ⚠ Skipping ${skillDir}/ — no SKILL.md found`);
      continue;
    }

    let meta: SkillFrontmatter;
    try {
      meta = parseFrontmatter(content);
    } catch (err) {
      console.error(`  ✗ ${skillDir}/SKILL.md: ${(err as Error).message}`);
      process.exit(1);
    }

    const path = `${skillDir}/SKILL.md`;
    const source = `${REGISTRY_REPO}/${path}`;
    const hash = createHash("sha256").update(content).digest("hex");

    registrySkills.push({
      name: meta.name,
      description: meta.description,
      tags: meta.tags,
      platforms: meta.platforms,
      path,
      author: meta.author,
    });

    lockSkills[meta.name] = {
      source,
      sourceType: "github",
      computedHash: hash,
    };

    console.log(`  ✓ ${meta.name} (${path})`);
  }

  // Write registry.json
  const registry = { version: 1, skills: registrySkills };
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf-8");

  // Write skills-lock.json
  const lock = { version: 1, skills: lockSkills };
  writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, "utf-8");

  console.log(
    `\n✓ Generated registry.json (${registrySkills.length} skills) and skills-lock.json`
  );
}

main();
