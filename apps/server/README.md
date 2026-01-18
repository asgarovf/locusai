<p align="center">
  <img src="https://raw.githubusercontent.com/asgarovf/locusai/refs/heads/master/assets/logo.png" alt="Locus" width="150" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@locusai/server"><img src="https://img.shields.io/npm/v/@locusai/server?color=blue" alt="npm version" /></a>
  <a href="https://github.com/asgarovf/locusai/blob/master/LICENSE"><img src="https://img.shields.io/github/license/asgarovf/locusai?color=blue" alt="License" /></a>
  <a href="https://github.com/asgarovf/locusai"><img src="https://img.shields.io/github/stars/asgarovf/locusai?style=flat&color=blue" alt="GitHub Stars" /></a>
</p>

# @locusai/server

The backend API server for **Locus** — a local-first AI development platform.

## Features

- **RESTful API** for task management, documents, and CI runs
- **SQLite database** for local-first data storage
- **Real-time events** for live updates
- **CI execution** with allowlisted commands

## Usage

This package is bundled with `@locusai/cli`. You typically don't need to install it directly.

```bash
# Start via CLI (recommended)
npx @locusai/cli dev
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/tasks` | List all tasks |
| `POST /api/tasks` | Create a new task |
| `GET /api/docs/tree` | Get documentation structure |
| `POST /api/ci/run` | Execute a CI preset |

## Part of Locus

This package is part of the [Locus](https://github.com/asgarovf/locusai) platform.

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
