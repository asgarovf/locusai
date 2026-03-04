/**
 * `locus create <name>` — Scaffold a new Locus community package.
 *
 * Generates the full package structure with correct naming, dependencies,
 * entrypoints, and configuration so community members can start building
 * packages immediately.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  bold,
  cyan,
  dim,
  gray,
  green,
  red,
  yellow,
} from "../display/terminal.js";

// ─── Name Validation ────────────────────────────────────────────────────────

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

function validateName(name: string): string | null {
  if (!name) return "Package name is required.";
  if (!NAME_PATTERN.test(name))
    return "Name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens.";
  if (name.startsWith("locus-"))
    return "Don't include the \"locus-\" prefix — it's added automatically.";
  if (name.length > 50) return "Name must be 50 characters or fewer.";
  return null;
}

function capitalize(str: string): string {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── npm Check ──────────────────────────────────────────────────────────────

function checkNpmExists(fullName: string): boolean {
  try {
    execSync(`npm view ${fullName} version 2>/dev/null`, {
      stdio: "pipe",
      timeout: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Argument Parsing ───────────────────────────────────────────────────────

interface CreateArgs {
  name: string;
  description: string;
}

function parseCreateArgs(args: string[]): CreateArgs | null {
  let name = "";
  let description = "";

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--description" || arg === "-D") {
      description = args[++i] ?? "";
    } else if (arg === "help" || arg === "--help" || arg === "-h") {
      return null;
    } else if (!arg.startsWith("-")) {
      name = arg;
    }
    i++;
  }

  return { name, description };
}

// ─── Templates ──────────────────────────────────────────────────────────────

function generatePackageJson(
  name: string,
  displayName: string,
  description: string,
  sdkVersion: string
): string {
  const pkg = {
    name: `@locusai/locus-${name}`,
    version: "0.1.0",
    description,
    type: "module",
    bin: {
      [`locus-${name}`]: `./bin/locus-${name}.js`,
    },
    files: ["bin", "package.json", "README.md"],
    locus: {
      displayName,
      description,
      commands: [name],
      version: "0.1.0",
    },
    scripts: {
      build: `bun build src/cli.ts --outfile bin/locus-${name}.js --target node`,
      typecheck: "tsc --noEmit",
      lint: "biome lint .",
      format: "biome format --write .",
    },
    dependencies: {
      "@locusai/sdk": `^${sdkVersion}`,
    },
    devDependencies: {
      typescript: "^5.8.3",
    },
    keywords: ["locusai-package", "locus", name],
    engines: {
      node: ">=18",
    },
    license: "MIT",
  };

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function generateTsconfig(): string {
  const config = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      isolatedModules: true,
      resolveJsonModule: true,
      noEmit: true,
      rootDir: "./src",
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist", "bin"],
  };

  return `${JSON.stringify(config, null, 2)}\n`;
}

function generateCliTs(): string {
  return `#!/usr/bin/env node

import { main } from "./index.js";

main(process.argv.slice(2)).catch((error) => {
  console.error(\`Fatal error: \${error.message}\`);
  process.exit(1);
});
`;
}

function generateIndexTs(name: string): string {
  return `import { createLogger, readLocusConfig } from "@locusai/sdk";

const logger = createLogger("${name}");

export async function main(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  switch (command) {
    case "start":
      return handleStart();
    case "help":
    case "--help":
    case "-h":
      return printHelp();
    default:
      console.error(\`Unknown command: \${command}\`);
      printHelp();
      process.exit(1);
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────

function handleStart(): void {
  const config = readLocusConfig();
  logger.info(\`Hello from locus-${name}! Repo: \${config.github.owner}/\${config.github.repo}\`);
  // TODO: Implement your package logic here
}

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(\`
  locus-${name}

  Usage:
    locus pkg ${name} <command>

  Commands:
    start       Start the ${name} integration
    help        Show this help message
  \`);
}
`;
}

function generateReadme(
  name: string,
  displayName: string,
  description: string
): string {
  return `# @locusai/locus-${name}

${description}

## Installation

\`\`\`bash
locus install ${name}
\`\`\`

## Usage

\`\`\`bash
locus pkg ${name} start      # Start the integration
locus pkg ${name} help       # Show help
\`\`\`

## Configuration

Configure via \`locus config\`:

\`\`\`bash
locus config set packages.${name}.apiKey "your-api-key"
\`\`\`

## Development

\`\`\`bash
# Build
bun run build

# Type check
bun run typecheck

# Lint
bun run lint

# Test locally
locus pkg ${name}
\`\`\`

## License

MIT
`;
}

// ─── Command ────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("locus create")} — Scaffold a new Locus community package

${bold("Usage:")}
  locus create <name> [options]

${bold("Arguments:")}
  ${cyan("<name>")}               Package short name (e.g. slack, discord, jira)

${bold("Options:")}
  ${dim("--description, -D")}    Package description (default: auto-generated)
  ${dim("--help, -h")}           Show this help

${bold("Examples:")}
  locus create slack                                    ${dim("# Create packages/slack/")}
  locus create discord -D "Control Locus via Discord"   ${dim("# With custom description")}

${bold("What gets created:")}
  packages/<name>/
  ├── src/
  │   ├── cli.ts          ${dim("# Entry point")}
  │   └── index.ts        ${dim("# Main logic with command dispatch")}
  ├── package.json        ${dim("# Full config with locus manifest")}
  ├── tsconfig.json       ${dim("# TypeScript configuration")}
  └── README.md           ${dim("# Package documentation")}

${bold("Next steps after creation:")}
  ${gray("1.")} cd packages/<name>
  ${gray("2.")} Implement your logic in src/index.ts
  ${gray("3.")} bun install && bun run build
  ${gray("4.")} Test locally with: locus pkg <name>
  ${gray("5.")} Submit a pull request

`);
}

export async function createCommand(args: string[]): Promise<void> {
  const parsed = parseCreateArgs(args);

  if (!parsed || !parsed.name) {
    printHelp();
    if (parsed && !parsed.name) {
      process.stderr.write(`${red("✗")} Package name is required.\n\n`);
      process.stderr.write(`  Usage: ${bold("locus create <name>")}\n\n`);
      process.exit(1);
    }
    return;
  }

  const { name } = parsed;
  const displayName = capitalize(name);
  const description =
    parsed.description || `${displayName} integration for Locus`;
  const fullNpmName = `@locusai/locus-${name}`;

  process.stderr.write(
    `\n${bold("Creating package:")} ${cyan(fullNpmName)}\n\n`
  );

  // 1. Validate name
  const nameError = validateName(name);
  if (nameError) {
    process.stderr.write(`${red("✗")} ${nameError}\n`);
    process.exit(1);
  }
  process.stderr.write(`${green("✓")} Name is valid: ${bold(name)}\n`);

  // 2. Check if directory already exists
  const packagesDir = join(process.cwd(), "packages", name);
  if (existsSync(packagesDir)) {
    process.stderr.write(
      `${red("✗")} Directory already exists: ${bold(`packages/${name}/`)}\n`
    );
    process.exit(1);
  }

  // 3. Check npm registry
  process.stderr.write(`${cyan("●")} Checking npm registry...`);
  const existsOnNpm = checkNpmExists(fullNpmName);
  if (existsOnNpm) {
    process.stderr.write(
      `\r${yellow("⚠")} Package ${bold(fullNpmName)} already exists on npm. You may want to choose a different name.\n`
    );
  } else {
    process.stderr.write(
      `\r${green("✓")} Name is available on npm                \n`
    );
  }

  // 4. Determine SDK version from the monorepo
  let sdkVersion = "0.22.0";
  try {
    const sdkPkgPath = join(process.cwd(), "packages", "sdk", "package.json");
    if (existsSync(sdkPkgPath)) {
      const { readFileSync } = await import("node:fs");
      const sdkPkg = JSON.parse(readFileSync(sdkPkgPath, "utf-8"));
      if (sdkPkg.version) sdkVersion = sdkPkg.version;
    }
  } catch {
    // Use fallback
  }

  // 5. Create directory structure
  mkdirSync(join(packagesDir, "src"), { recursive: true });
  mkdirSync(join(packagesDir, "bin"), { recursive: true });
  process.stderr.write(`${green("✓")} Created directory structure\n`);

  // 6. Write files
  writeFileSync(
    join(packagesDir, "package.json"),
    generatePackageJson(name, displayName, description, sdkVersion),
    "utf-8"
  );
  process.stderr.write(`${green("✓")} Generated package.json\n`);

  writeFileSync(
    join(packagesDir, "tsconfig.json"),
    generateTsconfig(),
    "utf-8"
  );
  process.stderr.write(`${green("✓")} Generated tsconfig.json\n`);

  writeFileSync(join(packagesDir, "src", "cli.ts"), generateCliTs(), "utf-8");
  process.stderr.write(`${green("✓")} Generated src/cli.ts\n`);

  writeFileSync(
    join(packagesDir, "src", "index.ts"),
    generateIndexTs(name),
    "utf-8"
  );
  process.stderr.write(`${green("✓")} Generated src/index.ts\n`);

  writeFileSync(
    join(packagesDir, "README.md"),
    generateReadme(name, displayName, description),
    "utf-8"
  );
  process.stderr.write(`${green("✓")} Generated README.md\n`);

  // 7. Success message
  process.stderr.write(`\n${bold(green("Package created!"))}\n\n`);
  process.stderr.write(`${bold("Next steps:")}\n`);
  process.stderr.write(
    `  ${gray("1.")} Implement your logic in ${bold(`packages/${name}/src/index.ts`)}\n`
  );
  process.stderr.write(
    `  ${gray("2.")} Install dependencies: ${bold("bun install")}\n`
  );
  process.stderr.write(
    `  ${gray("3.")} Build your package:   ${bold(`cd packages/${name} && bun run build`)}\n`
  );
  process.stderr.write(
    `  ${gray("4.")} Test locally:         ${bold(`locus pkg ${name}`)}\n`
  );
  process.stderr.write(`  ${gray("5.")} Submit a pull request\n`);
  process.stderr.write(
    `\n  ${dim("See the full guide:")} ${cyan("packages/sdk/PACKAGE_GUIDE.md")}\n\n`
  );
}
