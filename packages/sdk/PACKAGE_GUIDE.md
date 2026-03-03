# Locus Package Author Guide

This guide explains how to build, test, and contribute a community package to
the [Locus](https://github.com/asgarovf/locusai) monorepo.

All community packages live inside the Locus repository under `packages/` and
are published to npm through the project's automated release pipeline.
To add a new package, you prepare it in the repo and submit a pull request.

---

## How packages work

When a user runs `locus install <name>`, the CLI fetches the package from npm
and places it in `~/.locus/packages/`. The user then invokes it via
`locus pkg <name> [args...]`, which resolves the binary and forwards arguments.

Packages use the `@locusai/sdk` to read project config, invoke Locus
sub-commands, and log with consistent formatting.

---

## Naming convention

All official Locus packages are scoped under `@locusai` and prefixed with
`locus-`:

| Short name | npm package name             |
|------------|------------------------------|
| `telegram` | `@locusai/locus-telegram`    |
| `slack`    | `@locusai/locus-slack`       |
| `jira`     | `@locusai/locus-jira`        |

Users install packages by short name:

```sh
locus install telegram        # resolves to @locusai/locus-telegram
locus install slack           # resolves to @locusai/locus-slack
```

---

## Package structure

Every package lives in `packages/<name>/` inside the monorepo. Use the
`@locusai/locus-telegram` package as the canonical reference.

```
packages/<name>/
├── bin/
│   └── locus-<name>.js       # Compiled binary (build output)
├── src/
│   ├── cli.ts                 # Entry point (delegates to index.ts)
│   └── index.ts               # Main logic
├── package.json
├── tsconfig.json
└── README.md
```

---

## `package.json` requirements

Every package **must** include these fields:

```jsonc
{
  "name": "@locusai/locus-<name>",
  "version": "0.21.13",
  "description": "Short description of what the package does",
  "type": "module",
  "bin": {
    "locus-<name>": "./bin/locus-<name>.js"
  },
  "files": [
    "bin",
    "package.json",
    "README.md"
  ],

  // Required: Locus package manifest
  "locus": {
    "displayName": "Human Name",
    "description": "One-line description shown in locus packages list",
    "commands": ["<name>"],
    "version": "0.1.0"
  },

  "scripts": {
    "build": "bun build src/cli.ts --outfile bin/locus-<name>.js --target node",
    "typecheck": "tsc --noEmit",
    "lint": "biome lint .",
    "format": "biome format --write ."
  },

  "dependencies": {
    "@locusai/sdk": "^0.21.13"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  },
  "keywords": [
    "locusai-package",
    "locus"
  ],
  "engines": {
    "node": ">=18"
  },
  "license": "MIT"
}
```

### Required fields explained

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Must be `@locusai/locus-<name>`. |
| `bin` | `object` | Binary entry point. Key must be `locus-<name>`. |
| `files` | `string[]` | Must include `"bin"`, `"package.json"`, `"README.md"`. Without this, npm may not ship compiled code. |
| `keywords` | `string[]` | **Must** include `"locusai-package"`. This is how the [packages page](https://locusai.dev/packages) discovers your package on npm. Without it, your package won't appear in the marketplace. |
| `locus.displayName` | `string` | Human-readable name shown in `locus packages list`. |
| `locus.description` | `string` | One-line description for the package listing. |
| `locus.commands` | `string[]` | Sub-commands contributed. Used in `locus pkg <name>` dispatch. |
| `locus.version` | `string` | Semver version for the Locus integration. |
| `engines` | `object` | Must require Node.js 18+. |

### Important: dependency versions

Never use `workspace:*` for dependencies that get published to npm. Use real
semver versions (e.g., `"^0.21.13"`) for inter-package deps like `@locusai/sdk`.
The `workspace:` protocol is not resolved by `npm publish`.

---

## Binary entry point

Your package must expose a binary via the `"bin"` field. After installation, Locus
discovers it at `~/.locus/packages/node_modules/.bin/locus-<name>`.

The binary should be a compiled JavaScript file with a shebang:

```js
#!/usr/bin/env node
import { main } from "./index.js";

main(process.argv.slice(2)).catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
```

When invoked via `locus pkg <name> [args...]`, the remaining args are forwarded
to your binary verbatim.

---

## Using `@locusai/sdk`

Add the SDK as a dependency (use a real semver version, not `workspace:*`):

```json
"dependencies": {
  "@locusai/sdk": "^0.21.13"
}
```

### Reading project config

```ts
import { readLocusConfig } from "@locusai/sdk";

// Reads ~/.locus/config.json + ./.locus/config.json and merges them.
const config = readLocusConfig();

console.log(config.github.owner); // "myorg"
console.log(config.ai.model);     // "claude-sonnet-4-6"
```

### Invoking `locus` sub-commands

```ts
import { invokeLocus, invokeLocusStream } from "@locusai/sdk";

// Captured output (blocking)
const result = await invokeLocus(["run", "42"]);
if (result.exitCode !== 0) {
  console.error("locus run failed:", result.stderr);
}

// Streaming (non-blocking)
const child = invokeLocusStream(["run", "42"]);
child.stdout?.on("data", (chunk: Buffer) => process.stdout.write(chunk));
child.on("exit", (code) => console.log("exited with", code));
```

### Structured logger

```ts
import { createLogger } from "@locusai/sdk";

const logger = createLogger("mypackage");

logger.info("Started");
logger.warn("Rate limit approaching", { remaining: 5 });
logger.error("Connection failed", { code: 503 });
logger.debug("Debug info", { detail: "value" }); // only shown with LOCUS_DEBUG=1
```

Output uses the same prefix symbols as the Locus CLI (`●`, `⚠`, `✗`, `⋯`).

---

## Step-by-step: adding a new package

### 1. Create the package directory

```sh
mkdir -p packages/<name>/src packages/<name>/bin
```

### 2. Create `package.json`

Use the template above. Set the `name` to `@locusai/locus-<name>` and fill in
the `locus` manifest.

### 3. Create `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./bin",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### 4. Write your source code

Create `src/cli.ts` as the entry point:

```ts
import { main } from "./index.js";

main(process.argv.slice(2)).catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
```

Create `src/index.ts` with your main logic:

```ts
import { createLogger, readLocusConfig } from "@locusai/sdk";

const logger = createLogger("<name>");

export async function main(args: string[]): Promise<void> {
  const config = readLocusConfig();
  logger.info(`Hello from locus-<name>! Repo: ${config.github.owner}/${config.github.repo}`);
  // Your logic here
}
```

### 5. Add build script to root `package.json`

Add your package's build to the root `build:packages` script:

```json
"build:<name>": "cd packages/<name> && bun run build"
```

And include it in the `build:packages` chain.

### 6. Build and test locally

```sh
# Install dependencies
bun install

# Build your package
cd packages/<name> && bun run build

# Test it locally via symlink
mkdir -p ~/.locus/packages/node_modules/.bin
ln -s $(pwd)/bin/locus-<name>.js ~/.locus/packages/node_modules/.bin/locus-<name>
mkdir -p ~/.locus/packages/node_modules/@locusai/locus-<name>
ln -s $(pwd)/package.json ~/.locus/packages/node_modules/@locusai/locus-<name>/package.json
ln -s $(pwd)/bin ~/.locus/packages/node_modules/@locusai/locus-<name>/bin

# Run your package
locus pkg <name>
```

### 7. Write a README

Every package must have a `README.md` that explains:
- What the package does
- Setup and configuration steps
- Available commands and usage
- Any required environment variables or API keys

See `packages/telegram/README.md` for a complete example.

### 8. Submit a pull request

Once your package builds, typechecks, and works locally:

1. Fork the [Locus repository](https://github.com/asgarovf/locusai)
2. Create a feature branch: `git checkout -b feat/locus-<name>`
3. Add a changeset: `bun changeset` (select your new package, choose `minor`)
4. Commit your changes and push
5. Open a pull request against `master`

The maintainers will review your package. Once merged, it will be published to
npm automatically through the Changesets release pipeline.

---

## Reference: `@locusai/locus-telegram`

The Telegram package (`packages/telegram/`) is the canonical example of a
community package. Study its structure for:

- **`package.json`**: Correct naming, `locus` manifest, `files` field, dependency versions
- **`src/cli.ts`**: Entry point pattern (delegates to `index.ts`)
- **`src/index.ts`**: Main logic using the SDK
- **Build script**: Uses `bun build` to compile to a single binary
- **README.md**: Complete documentation with setup, usage, and configuration

---

## Tooling and conventions

- **Package manager**: [Bun](https://bun.sh) (the monorepo uses `bun@1.2.4`)
- **Bundler**: `bun build` (compiles TypeScript to a single Node.js binary)
- **Linter**: [Biome](https://biomejs.dev/) — run `bun run lint` and `bun run format`
- **TypeScript**: 5.8+ — run `bun run typecheck`
- **Releases**: [Changesets](https://github.com/changesets/changesets) — automated via GitHub Actions

---

## Checklist before submitting your PR

- [ ] Package lives in `packages/<name>/` in the monorepo
- [ ] `package.json` name is `@locusai/locus-<name>`
- [ ] `"locus"` field present with all required keys (`displayName`, `description`, `commands`, `version`)
- [ ] `"files"` field includes `"bin"`, `"package.json"`, `"README.md"`
- [ ] `"keywords"` includes `"locusai-package"` (required for marketplace discovery)
- [ ] `"bin"` field points to `./bin/locus-<name>.js`
- [ ] Dependencies use real semver versions (no `workspace:*`)
- [ ] Binary builds cleanly with `bun run build`
- [ ] `bun run typecheck` passes with no errors
- [ ] `bun run lint` passes with no errors
- [ ] Tested locally with `locus pkg <name>`
- [ ] `README.md` explains setup, configuration, and usage
- [ ] Changeset added via `bun changeset`
