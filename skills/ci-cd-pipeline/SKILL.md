---
name: ci-cd-pipeline
description: Create and optimize CI/CD pipelines with GitHub Actions, automated testing, deployment, and release workflows. Use when setting up continuous integration, deployment automation, or improving build pipelines.
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
tags: [ci-cd, github-actions, deployment, automation, pipeline, testing, release, devops]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# CI/CD Pipeline

## When to use this skill
- Setting up CI/CD for a new project
- Adding GitHub Actions workflows
- Optimizing slow CI pipelines
- Adding automated testing, linting, or deployments
- Setting up release automation

## GitHub Actions: Standard CI workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: matrix.node-version == 20
        with:
          name: coverage
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

## GitHub Actions: Common patterns

### Caching dependencies

```yaml
# Node.js
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'  # Built-in caching

# Python
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'

# Custom cache
- uses: actions/cache@v4
  with:
    path: ~/.cache/custom
    key: ${{ runner.os }}-custom-${{ hashFiles('**/config.lock') }}
    restore-keys: ${{ runner.os }}-custom-
```

### Database services for integration tests

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

  redis:
    image: redis:7
    ports:
      - 6379:6379
```

### Conditional steps

```yaml
# Only on push to main
- run: npm run deploy
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'

# Only when specific files changed
- uses: dorny/paths-filter@v3
  id: changes
  with:
    filters: |
      src:
        - 'src/**'
      docs:
        - 'docs/**'

- run: npm test
  if: steps.changes.outputs.src == 'true'
```

### Secrets and environment variables

```yaml
env:
  NODE_ENV: test

steps:
  - run: npm run deploy
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Release automation

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

## Pipeline optimization tips

1. **Parallelize jobs**: Independent jobs run concurrently
2. **Cache aggressively**: Dependencies, build outputs, Docker layers
3. **Cancel stale runs**: Use `concurrency` with `cancel-in-progress`
4. **Skip unnecessary work**: Use path filters
5. **Use matrix builds** only when needed (each adds a job)
6. **Pin action versions**: Use SHA or major version tags

## Checklist

- [ ] CI runs on push and PR to main branch
- [ ] Linting and type checking included
- [ ] Tests run with coverage
- [ ] Dependencies are cached
- [ ] Stale runs are cancelled (concurrency)
- [ ] Secrets stored in GitHub Secrets (not hardcoded)
- [ ] Build step validates compilation
- [ ] Release workflow automated (if applicable)
- [ ] Pipeline runs in < 5 minutes for PRs
