import { chmod, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { VERSIONS } from "../constants.js";
import type { ProjectConfig } from "../types.js";
import { ensureDir, writeJson } from "../utils.js";

export async function setupStructure(config: ProjectConfig) {
  console.log("Setting up monorepo structure...");
  const { projectPath, locusDir } = config;
  await ensureDir(projectPath);
  await ensureDir(join(projectPath, "apps/web/src"));
  await ensureDir(join(projectPath, "apps/server/src"));
  await ensureDir(join(projectPath, "packages/shared/src"));
  await ensureDir(join(locusDir, "artifacts"));
  await ensureDir(join(locusDir, "logs"));
  await ensureDir(join(locusDir, "docs"));
  await ensureDir(join(projectPath, ".husky"));
  await ensureDir(join(projectPath, ".vscode"));
}

export async function generateRootConfigs(config: ProjectConfig) {
  console.log("Generating root configurations...");
  const { projectPath, projectName, scopedName } = config;

  // package.json
  await writeJson(join(projectPath, "package.json"), {
    name: projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    workspaces: ["apps/*", "packages/*"],
    engines: {
      node: `>=${VERSIONS.node}`,
      bun: `>=${VERSIONS.bun}`,
    },
    scripts: {
      dev: 'bun run --filter "*" dev',
      build: 'bun run --filter "*" build',
      lint: "biome lint .",
      format: "biome check --write .",
      typecheck: "tsc -b --noEmit",
      syncpack: "syncpack list",
      "syncpack:fix": "syncpack fix",
      prepare: "husky",
    },
    devDependencies: {
      "@biomejs/biome": VERSIONS.biome,
      typescript: VERSIONS.typescript,
      "@types/node": VERSIONS.typesNode,
      syncpack: VERSIONS.syncpack,
      husky: VERSIONS.husky,
      "@commitlint/cli": VERSIONS.commitlint,
      "@commitlint/config-conventional": VERSIONS.commitlintConfig,
      "@types/bun": VERSIONS.typesBun,
    },
  });

  // tsconfig.base.json
  await writeJson(join(projectPath, "tsconfig.base.json"), {
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      isolatedModules: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      composite: true,
      incremental: true,
      lib: ["ESNext", "DOM", "DOM.Iterable"],
      types: ["bun-types"],
    },
  });

  // tsconfig.json (Solution-style)
  await writeJson(join(projectPath, "tsconfig.json"), {
    files: [],
    references: [
      { path: "./packages/shared" },
      { path: "./apps/web" },
      { path: "./apps/server" },
    ],
  });

  // biome.json
  await writeJson(join(projectPath, "biome.json"), {
    $schema: `https://biomejs.dev/schemas/${VERSIONS.biome}/schema.json`,
    vcs: { enabled: true, clientKind: "git", useIgnoreFile: true },
    files: {
      ignoreUnknown: false,
      includes: [
        "**",
        "!**/node_modules",
        "!**/dist",
        "!**/build",
        "!**/coverage",
      ],
    },
    formatter: {
      enabled: true,
      formatWithErrors: false,
      indentStyle: "space",
      indentWidth: 2,
      lineEnding: "lf",
      lineWidth: 80,
      attributePosition: "auto",
    },
    assist: { actions: { source: { organizeImports: "on" } } },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
        complexity: {
          noExtraBooleanCast: "error",
          noUselessCatch: "error",
          noUselessTypeConstraint: "error",
        },
        correctness: {
          noConstAssign: "error",
          noEmptyPattern: "error",
          noUnusedImports: "error",
          noUnusedVariables: "error",
          useValidTypeof: "error",
        },
        style: {
          noNamespace: "error",
          useAsConstAssertion: "error",
          noParameterAssign: "error",
          noNonNullAssertion: "error",
          useImportType: "off",
        },
        suspicious: {
          noAsyncPromiseExecutor: "error",
          noCatchAssign: "error",
          noDebugger: "error",
          noDuplicateObjectKeys: "error",
          noExplicitAny: "error",
        },
      },
    },
    javascript: {
      globals: ["React", "JSX", "Bun"],
      formatter: {
        quoteStyle: "double",
        jsxQuoteStyle: "double",
        trailingCommas: "es5",
        semicolons: "always",
        arrowParentheses: "always",
        bracketSpacing: true,
      },
    },
    css: {
      parser: {
        tailwindDirectives: true,
      },
    },
  });

  // .syncpackrc
  await writeJson(join(projectPath, ".syncpackrc"), {
    dependencyTypes: ["dev", "prod"],
    semverGroups: [{ range: "", dependencies: ["**"] }],
    versionGroups: [
      {
        label: "Internal packages use workspace protocols",
        dependencies: [`${scopedName}/*`],
        dependencyTypes: ["prod", "dev"],
        pinVersion: "workspace:*",
      },
    ],
  });

  // commitlint.config.js
  await writeFile(
    join(projectPath, "commitlint.config.js"),
    "export default { extends: ['@commitlint/config-conventional'] };\n"
  );

  // .husky/pre-commit
  const preCommit = `#!/usr/bin/env bash
. "$(dirname -- "$0")/_/husky.sh"

bun run lint
`;
  await writeFile(join(projectPath, ".husky/pre-commit"), preCommit);
  await chmod(join(projectPath, ".husky/pre-commit"), 0o755);

  // .gitignore
  const gitignore = `node_modules
.next
dist
.locus/db.sqlite
.locus/logs
.locus/artifacts
.DS_Store
*.log
.env
.env.local
.turbo
`;
  await writeFile(join(projectPath, ".gitignore"), gitignore);

  // .nvmrc
  await writeFile(join(projectPath, ".nvmrc"), `${VERSIONS.node}\n`);

  // .vscode/settings.json
  await writeJson(join(projectPath, ".vscode/settings.json"), {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports.biome": "explicit",
    },
    "[javascript]": {
      "editor.defaultFormatter": "biomejs.biome",
    },
    "[javascriptreact]": {
      "editor.defaultFormatter": "biomejs.biome",
    },
    "[typescript]": {
      "editor.defaultFormatter": "biomejs.biome",
    },
    "[typescriptreact]": {
      "editor.defaultFormatter": "biomejs.biome",
    },
    "[json]": {
      "editor.defaultFormatter": "biomejs.biome",
    },
    "[jsonc]": {
      "editor.defaultFormatter": "biomejs.biome",
    },
    "files.associations": {
      "*.css": "tailwindcss",
      "*.scss": "tailwindcss",
    },
  });

  // .vscode/extensions.json
  await writeJson(join(projectPath, ".vscode/extensions.json"), {
    recommendations: ["biomejs.biome"],
  });
}
