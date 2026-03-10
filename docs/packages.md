# Packages

Locus has an extensible package system that lets the community add new integrations and capabilities.

## Installing packages

```bash
locus install telegram        # installs @locusai/locus-telegram
```

You can pin a specific version:

```bash
locus install telegram@1.0.0
```

## Managing packages

```bash
locus packages                # list installed packages
locus packages list           # same as above
locus packages outdated       # check for available upgrades
locus uninstall telegram      # remove a package
```

## Running package commands

```bash
locus pkg telegram start      # run the "start" sub-command
locus pkg telegram --help     # show package help
```

When you run `locus pkg <name> [args...]`, Locus resolves the package binary and forwards all arguments to it.

## Upgrading packages

```bash
locus install telegram --upgrade    # upgrade to latest version
```

## Building your own package

The easiest way to create a new package is with the built-in scaffolding command:

### Quick start

```bash
# Scaffold a new package with all required files
locus create slack

# With a custom description
locus create discord --description "Control Locus via Discord"
```

This generates the full package structure with correct naming, dependencies, entrypoints, and configuration:

```
packages/<name>/
├── src/
│   ├── cli.ts          # Entry point
│   └── index.ts        # Main logic with command dispatch
├── package.json        # Full config with locus manifest, bin, files, keywords
├── tsconfig.json       # TypeScript configuration
└── README.md           # Package documentation
```

### After scaffolding

1. Implement your logic in `packages/<name>/src/index.ts`
2. Install dependencies: `bun install`
3. Build your package: `cd packages/<name> && bun run build`
4. Test locally: `locus pkg <name>`
5. Submit a pull request

### How to contribute a package

1. Fork the [Locus repository](https://github.com/asgarovf/locusai)
2. Run `locus create <name>` to scaffold the package
3. Implement your integration using the `@locusai/sdk`
4. Test locally with `locus pkg <name>`
5. Submit a pull request

### Package requirements

- **Naming**: `@locusai/locus-<name>` (scoped under `@locusai`)
- **Manifest**: Must include a `"locus"` field in `package.json` with `displayName`, `description`, `commands`, and `version`
- **Binary**: Must expose an executable via the `"bin"` field
- **Files field**: Must include `"bin"`, `"package.json"`, `"README.md"` in the `"files"` array
- **Keywords**: Must include `"locusai-package"` for marketplace discovery
- **Dependencies**: Use real semver versions, never `workspace:*`
- **Documentation**: Every package needs a `README.md` with setup, usage, and configuration

All of these are handled automatically by `locus create`.

### Detailed guide

See the complete [Package Author Guide](https://github.com/asgarovf/locusai/blob/master/packages/sdk/PACKAGE_GUIDE.md) for:

- Full `package.json` template
- SDK usage examples (config, invocation, logging)
- Pre-submission checklist

### Reference implementations

Study these packages for complete real-world examples:

- [Telegram package](https://github.com/asgarovf/locusai/tree/master/packages/telegram) — remote control via Telegram bot
- [Linear package](https://github.com/asgarovf/locusai/tree/master/packages/linear) — bidirectional Linear integration
- [Jira package](https://github.com/asgarovf/locusai/tree/master/packages/jira) — Jira issue sync and execution
- [Cron package](https://github.com/asgarovf/locusai/tree/master/packages/cron) — recurring task scheduling
