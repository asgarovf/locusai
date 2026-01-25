---
title: Contributing to Locus
---

We welcome contributions to Locus! As an AI-native project management platform, we value transparency, simplicity, and robustness.

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally.
3. **Install dependencies** with Bun:

```bash
bun install
```

## Repository Structure

Locus is a monorepo managed by Turborepo.

- **`apps/`**
  - `api`: The NestJS Cloud API and Orchestration Engine.
  - `www`: The Next.js Landing Page and Dashboard.
- **`packages/`**
  - `cli`: The Local Agent Runtime and CLI tool.
  - `sdk`: Core business logic shared between CLI and API.
  - `shared`: Zod schemas and TypeScript interfaces shared across the stack.

## Development Workflow

### 1. Make Changes
Create a feature branch and implement your changes. We follow a modular architecture:
- **Backend**: Use the Controller-Service-Repository pattern.
- **Frontend**: Use Shadcn UI components and Tailwind CSS.

### 2. Verify
Before pushing, ensure your code passes standard checks:

```bash
# Run linting
bun run lint

# Run type checking
bun run typecheck
```

### 3. Submit PR
Submit a Pull Request to the `master` branch. Please include a clear description of your changes and why they are necessary.

## License

Locus is open-source software licensed under the [MIT license](https://github.com/asgarovf/locusai/blob/master/LICENSE).
