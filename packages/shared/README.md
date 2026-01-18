<p align="center">
  <img src="https://raw.githubusercontent.com/asgarovf/locusai/refs/heads/master/assets/logo.png" alt="Locus" width="150" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@locusai/shared"><img src="https://img.shields.io/npm/v/@locusai/shared?color=blue" alt="npm version" /></a>
  <a href="https://github.com/asgarovf/locusai/blob/master/LICENSE"><img src="https://img.shields.io/github/license/asgarovf/locusai?color=blue" alt="License" /></a>
  <a href="https://github.com/asgarovf/locusai"><img src="https://img.shields.io/github/stars/asgarovf/locusai?style=flat&color=blue" alt="GitHub Stars" /></a>
</p>

# @locusai/shared

Shared types, schemas, and utilities for the **Locus** platform.

## Installation

```bash
npm install @locusai/shared
```

## What's Included

- **TypeScript types** for tasks, artifacts, CI runs, and more
- **Zod schemas** for runtime validation
- **Enums** for task status, CI status, and artifact types

## Usage

```typescript
import { TaskStatus, TaskSchema, CiRunStatus } from "@locusai/shared";

// Use types
const status: TaskStatus = TaskStatus.IN_PROGRESS;

// Validate data
const task = TaskSchema.parse(data);
```

## Part of Locus

This package is part of the [Locus](https://github.com/asgarovf/locusai) platform — a local-first AI development platform for task management, documentation, and CI coordination.

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
