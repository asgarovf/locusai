# Packages

Locus has an extensible package system that lets the community add new integrations and capabilities.

## Installing packages

```bash
locus install telegram        # installs @locusai/locus-telegram
locus install slack           # installs @locusai/locus-slack
```

You can pin a specific version:

```bash
locus install telegram@1.0.0
locus install telegram --version 1.0.0
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

## Available packages

| Package | Description |
|---------|-------------|
| [`@locusai/locus-telegram`](https://www.npmjs.com/package/@locusai/locus-telegram) | Remote-control Locus via Telegram |

## Building your own package

All community packages are developed in the [Locus monorepo](https://github.com/asgarovf/locusai) and published through the automated release pipeline.

### How to contribute a package

1. Fork the [Locus repository](https://github.com/asgarovf/locusai)
2. Create your package in `packages/<name>/` following the required structure
3. Use the `@locusai/sdk` for config, logging, and CLI invocation
4. Test locally with `locus pkg <name>`
5. Submit a pull request

### Package requirements

- **Naming**: `@locusai/locus-<name>` (scoped under `@locusai`)
- **Manifest**: Must include a `"locus"` field in `package.json` with `displayName`, `description`, `commands`, and `version`
- **Binary**: Must expose an executable via the `"bin"` field
- **Files field**: Must include `"bin"`, `"package.json"`, `"README.md"` in the `"files"` array
- **Dependencies**: Use real semver versions, never `workspace:*`
- **Documentation**: Every package needs a `README.md` with setup, usage, and configuration

### Detailed guide

See the complete [Package Author Guide](https://github.com/asgarovf/locusai/blob/master/packages/sdk/PACKAGE_GUIDE.md) for:

- Full `package.json` template
- Step-by-step creation walkthrough
- SDK usage examples (config, invocation, logging)
- Pre-submission checklist

### Reference implementation

Study the [Telegram package](https://github.com/asgarovf/locusai/tree/master/packages/telegram) for the canonical example of naming, structure, build configuration, and documentation.
