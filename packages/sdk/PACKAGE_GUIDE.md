# Locus Package Author Guide

This guide explains how to build, test, and publish a community package for
the [Locus](https://github.com/locusai/locus) CLI.

---

## Naming convention

All Locus packages must be published to npm with the prefix `locus-`:

| Short name | npm package name  |
|------------|-------------------|
| `telegram` | `locus-telegram`  |
| `slack`    | `locus-slack`     |
| `jira`     | `locus-jira`      |

Scoped packages (e.g. `@myorg/locus-telegram`) are also accepted and will be
used as-is.

---

## `package.json` manifest format

Every Locus package **must** include a `"locus"` field in its `package.json`.
This field tells the Locus CLI how to display and invoke your package.

```jsonc
{
  "name": "locus-telegram",
  "version": "1.0.0",
  "description": "Remote-control Locus via Telegram",
  "bin": {
    "locus-telegram": "./bin/locus-telegram.js"
  },

  // Required: Locus package manifest
  "locus": {
    "displayName": "Telegram",
    "description": "Remote-control your Locus agent from Telegram",
    "commands": ["telegram"],
    "version": "1.0.0"
  }
}
```

| Field         | Type       | Description                                                      |
|---------------|------------|------------------------------------------------------------------|
| `displayName` | `string`   | Human-readable name shown in `locus packages list`.             |
| `description` | `string`   | One-line description shown in `locus packages list`.            |
| `commands`    | `string[]` | Sub-commands contributed. Used in `locus pkg <name>` dispatch.  |
| `version`     | `string`   | Semver version — should mirror the npm package version.         |

---

## Binary entry point

Your package must expose a binary. Locus discovers it via
`~/.locus/packages/node_modules/.bin/locus-<name>` after installation.

In `package.json`:

```json
"bin": {
  "locus-telegram": "./bin/locus-telegram.js"
}
```

The binary should be executable Node.js (shebang `#!/usr/bin/env node`).

When invoked via `locus pkg telegram [args...]`, the remaining args are
forwarded to your binary verbatim.

---

## Using `@locusai/sdk`

Install the SDK as a dev dependency (it is a peer contract, not bundled):

```sh
npm install --save-dev @locusai/sdk
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

const logger = createLogger("telegram");

logger.info("Bot started");
logger.warn("Rate limit approaching", { remaining: 5 });
logger.error("Connection failed", { code: 503 });
logger.debug("Raw update", { update_id: 12345 }); // only shown with LOCUS_DEBUG=1
```

Output uses the same prefix symbols as the Locus CLI (`●`, `⚠`, `✗`, `⋯`).

---

## Minimal end-to-end example

Below is a complete minimal Locus package (`locus-hello`).

### Directory structure

```
locus-hello/
├── bin/
│   └── locus-hello.js
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

### `package.json`

```json
{
  "name": "locus-hello",
  "version": "1.0.0",
  "description": "Example Locus package",
  "type": "module",
  "bin": {
    "locus-hello": "./bin/locus-hello.js"
  },
  "locus": {
    "displayName": "Hello",
    "description": "A minimal example Locus package",
    "commands": ["hello"],
    "version": "1.0.0"
  },
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "@locusai/sdk": "^0.1.0",
    "typescript": "^5.0.0"
  }
}
```

### `src/index.ts`

```ts
import { createLogger, readLocusConfig } from "@locusai/sdk";

const logger = createLogger("hello");

export async function run(): Promise<void> {
  const config = readLocusConfig();
  logger.info(`Hello from locus-hello! Repo: ${config.github.owner}/${config.github.repo}`);
}
```

### `bin/locus-hello.js`

```js
#!/usr/bin/env node
import "../dist/index.js";

const { run } = await import("../dist/index.js");
await run();
```

Make it executable:

```sh
chmod +x bin/locus-hello.js
```

---

## Testing locally with `npm link`

1. Build your package:

   ```sh
   npm run build
   ```

2. Link it globally:

   ```sh
   npm link
   ```

3. Install it into Locus's packages directory:

   ```sh
   locus install locus-hello
   ```

   Or, for a faster dev loop, symlink directly:

   ```sh
   mkdir -p ~/.locus/packages/node_modules
   ln -s $(pwd) ~/.locus/packages/node_modules/locus-hello
   mkdir -p ~/.locus/packages/node_modules/.bin
   ln -s $(pwd)/bin/locus-hello.js ~/.locus/packages/node_modules/.bin/locus-hello
   ```

4. Run your package:

   ```sh
   locus pkg hello
   ```

---

## Publishing to npm

1. Make sure the `"locus"` field is present in your `package.json`.
2. Ensure the binary listed in `"bin"` is executable.
3. Build your package.
4. Publish:

   ```sh
   npm publish --access public
   ```

After publishing, users can install your package with:

```sh
locus install hello     # short name (locus-hello)
locus install locus-hello
```

---

## Checklist before publishing

- [ ] Package name starts with `locus-` (or is scoped)
- [ ] `"locus"` field present in `package.json` with all required keys
- [ ] Binary listed in `"bin"` exists and has the shebang line
- [ ] Binary is executable (`chmod +x`)
- [ ] Package builds cleanly with no TypeScript errors
- [ ] Tested locally with `locus pkg <name>`
- [ ] `README.md` explains what the package does and how to configure it
