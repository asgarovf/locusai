---
title: Contributing to Locus
---

# Contributing

We welcome contributions to Locus! As a local-first platform, we value transparency, simplicity, and robustness.

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally.
3. **Install dependencies** with Bun:

```bash
bun install
```

4. **Initialize a test workspace**:

```bash
bun run workspace:init
```

## Repository Structure

- `apps/server`: The API and Engine.
- `apps/web`: The Dashboard UI.
- `apps/mcp`: The Agentic Interface.
- `packages/cli`: The Bundler and User Interface.

## Pull Request Process

1. Create a feature branch.
2. Make your changes using our patterns (modular service/controller architecture).
3. Ensure linting and typechecks pass (`bun run lint`, `bun run typecheck`).
4. Submit a PR. We review typically within 48 hours.

## License

Locus is open-source software licensed under the [MIT license](https://github.com/asgarovf/locusai/blob/master/LICENSE).
