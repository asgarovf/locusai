# Locus SaaS Transition - Implementation Plan

## Overview

This plan outlines the transition from a local-first single-user tool to a hybrid SaaS platform where:
- **Cloud**: Stores all management state (Tasks, Docs, Sprints, Organizations, Projects)
- **Local**: Remains the execution engine (CI, file access, code changes)

## Technology Decisions

| Component       | Choice              | Rationale                                    |
|-----------------|---------------------|----------------------------------------------|
| Authentication  | Custom JWT          | Full control, no vendor lock-in              |
| Cloud Database  | Supabase PostgreSQL | Managed Postgres, good DX, generous free tier|
| Deployment      | Railway             | Easy monorepo deploys, good pricing          |
| Local Database  | SQLite (Bun)        | Zero config, file-based, fast                |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUD (SaaS)                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard  │  │  Cloud API  │  │      Cloud MCP          │  │
│  │  (Next.js)  │◄─┤  (Hono)     │◄─┤  (AI Agent Gateway)     │  │
│  └─────────────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│                          │                     │                │
│                   ┌──────▼──────┐              │                │
│                   │  PostgreSQL │              │                │
│                   │  - Orgs     │              │                │
│                   │  - Projects │              │                │
│                   │  - Tasks    │              │                │
│                   │  - Docs     │              │                │
│                   └─────────────┘              │                │
└───────────────────────────────────────────────┼─────────────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        │                       │                       │
              ┌─────────▼─────────┐   ┌─────────▼─────────┐   ┌─────────▼─────────┐
              │   Dev Machine A   │   │   Dev Machine B   │   │   AI Agent        │
              │   ┌───────────┐   │   │   ┌───────────┐   │   │   (Claude/GPT)    │
              │   │ Local CLI │   │   │   │ Local CLI │   │   │                   │
              │   │ + Engine  │   │   │   │ + Engine  │   │   │  Connects via     │
              │   └───────────┘   │   │   └───────────┘   │   │  API Key          │
              └───────────────────┘   └───────────────────┘   └───────────────────┘
```

## Phase 1: Multi-tenancy & Schema Foundation ✅

### Goal
Add Organization, Project, User, and APIKey concepts to the shared package.

### Tasks
- [x] Add new types: `Organization`, `Project`, `User`, `APIKey`, `Document`
- [x] Add new enums: `UserRole`, `MembershipRole`
- [x] Update existing entities (Task, Sprint) with `projectId`
- [x] Create Zod schemas for new entities
- [x] Verify typecheck and lint pass
- [ ] Update WorkspaceConfig to support cloud mode (Phase 2)

### Files Modified
- `packages/shared/src/types.ts`
- `packages/shared/src/schemas.ts`

---

## Phase 2: Database Adapter Layer (In Progress)

### Goal
Abstract the database layer to support both SQLite (local) and PostgreSQL (cloud).

### Tasks
- [x] Create `DatabaseAdapter` interface
- [x] Implement `SqliteAdapter` (local mode)
- [x] Implement `PostgresAdapter` stub (cloud mode placeholder)
- [x] Create PostgreSQL schema for Supabase
- [x] Update `BaseRepository` to support both adapters
- [ ] Fully implement `PostgresAdapter` with postgres package
- [ ] Refactor all repositories to use adapter methods
- [ ] Add `mode: 'local' | 'cloud'` to server config

### Files Created
- `apps/server/src/db/types.ts` - Adapter interface and config types
- `apps/server/src/db/sqlite.adapter.ts` - SQLite implementation
- `apps/server/src/db/postgres.adapter.ts` - PostgreSQL implementation + schema
- `apps/server/src/db/index.ts` - Factory and exports

### Files Modified
- `apps/server/src/repositories/base.repository.ts`

---

## Phase 3: Authentication & API Keys ✅

### Goal
Implement user authentication and API key management.

### Tasks
- [x] Add auth middleware (JWT-based) for Express
- [x] Implement API key generation/validation
- [x] Add `userId` context to requests
- [x] Create auth routes (register, login, api-keys)
- [x] Integrate Drizzle ORM for type-safe queries

### Dependencies Added
- `jsonwebtoken` + `@types/jsonwebtoken` - JWT handling
- `bcryptjs` + `@types/bcryptjs` - Password hashing
- `drizzle-orm` + `drizzle-kit` - ORM

### Files Created
- `packages/shared/src/auth.types.ts` - Auth type definitions
- `apps/server/src/auth/jwt.ts` - JWT sign/verify utilities
- `apps/server/src/auth/password.ts` - Password hashing + API key generation
- `apps/server/src/auth/auth.service.ts` - User/API key management (Drizzle)
- `apps/server/src/auth/middleware.ts` - Express auth middleware
- `apps/server/src/auth/index.ts` - Module exports
- `apps/server/src/routes/auth.routes.ts` - Auth API routes
- `apps/server/src/db/schema.ts` - Drizzle schema (all tables)
- `apps/server/src/db/drizzle.ts` - Database connection
- `apps/server/src/db/migrations.ts` - Table migrations

---

## Phase 4: Cloud MCP Gateway

### Goal
Deploy MCP server as a cloud service with API key authentication.

### Tasks
- [ ] Add API key validation to MCP tools
- [ ] Scope tool responses by project
- [ ] Deploy MCP as standalone cloud service

### Files to Modify
- `apps/mcp/src/index.ts`
- `apps/mcp/src/tools/*.ts`

---

## Phase 5: CLI Cloud Commands

### Goal
Add CLI commands for cloud workflow.

### New Commands
- `locus login` - Authenticate and store API key
- `locus init --remote` - Link local folder to cloud project
- `locus sync` - Manual sync (if needed)

### Files to Modify
- `packages/cli/src/index.ts`

---

## Data Model Summary

### New Entities

| Entity       | Fields                                                      |
|--------------|-------------------------------------------------------------|
| Organization | id, name, slug, createdAt                                   |
| Project      | id, orgId, name, slug, createdAt                            |
| User         | id, email, name, avatarUrl, createdAt                       |
| Membership   | id, userId, orgId, role, createdAt                          |
| APIKey       | id, userId, projectId, keyHash, name, lastUsedAt, createdAt |
| Document     | id, projectId, path, title, content, createdAt, updatedAt   |

### Updated Entities

| Entity   | New Fields |
|----------|------------|
| Task     | projectId  |
| Sprint   | projectId  |
| Artifact | (no change, linked via Task) |

---

## Migration Strategy

1. **Local users**: No breaking changes. SQLite mode continues to work.
2. **New SaaS users**: Start fresh with PostgreSQL.
3. **Migration path**: Future `locus migrate-to-cloud` command to upload local data.
