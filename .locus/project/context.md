# Project Context

## Mission

Locus is an AI-powered project management platform for engineering teams. It provides a backend API, a web dashboard, a marketing website, a CLI tool, a Telegram bot, and a shared SDK — all orchestrated as a Bun monorepo.

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Bun 1.2.4 (package manager + bundler) |
| **Language** | TypeScript 5.8.3 (strict mode) |
| **Backend** | NestJS 11 on Node.js |
| **Database** | PostgreSQL via TypeORM |
| **Frontend (app)** | Next.js 15, React 19, Tailwind CSS 4, Zustand, TanStack React Query |
| **Frontend (marketing)** | Next.js 15, React 19, Tailwind CSS, Shiki |
| **Validation** | Zod 4 (shared schemas, DTOs, config validation) |
| **Linting/Formatting** | Biome 2.3.11 (replaces ESLint + Prettier) |
| **Testing** | Jest 29 with @swc/jest transpiler |
| **Build Orchestration** | Turborepo |
| **Versioning** | Changesets |
| **Auth** | Passport (JWT + Google OAuth + API keys) |

## Architecture

### Monorepo Layout

```
apps/
  api/          → @locusai/api     — NestJS backend (private)
  web/          → @locusai/web     — Next.js dashboard (private)
  www/          → @locusai/www     — Next.js marketing site (private)
packages/
  shared/       → @locusai/shared  — Zod schemas, types, enums, constants (published)
  sdk/          → @locusai/sdk     — API client SDK (published)
  cli/          → @locusai/cli     — CLI tool (published)
  telegram/     → @locusai/telegram — Telegram bot (published)
```

Workspaces are defined in root `package.json` (`"workspaces": ["apps/*", "packages/*"]`). Turborepo orchestrates tasks with dependency-aware ordering via `turbo.json`.

### API Module Structure (NestJS)

Each feature follows this layout inside `apps/api/src/`:

```
{module}/
  {module}.module.ts        — NestJS module definition
  {module}.service.ts       — Business logic
  {module}.controller.ts    — HTTP endpoints
  __tests__/
    {module}.service.jest.ts
    {module}.controller.jest.ts
```

Supporting code lives in:
- `entities/` — TypeORM entity classes with barrel `index.ts`
- `common/filters/` — Global exception filters
- `common/interceptors/` — Transform, logging, sanitize interceptors
- `common/pipes/` — Zod validation pipe
- `common/decorators/` — Custom parameter/method decorators
- `common/services/` — Shared services (email, logger)
- `config/` — Typed configuration service with Zod validation

### Shared Package (`@locusai/shared`)

All DTOs, types, enums, and constants live here and are consumed by both the API and SDK. The package re-exports everything via barrel files:

```typescript
// packages/shared/src/index.ts
export * from "./common";
export * from "./constants";
export * from "./enums";
export * from "./models";
```

Types are defined as **Zod schemas first**, then inferred:

```typescript
export const UserSchema = z.object({ ... });
export type User = z.infer<typeof UserSchema>;
```

### SDK Architecture (`@locusai/sdk`)

Module composition pattern — the client exposes feature-specific modules:

```typescript
export class LocusClient {
  private readonly api: AxiosInstance;
  public readonly auth: AuthModule;
  public readonly tasks: TasksModule;
  // ...
}
```

Each module extends a `BaseModule` that holds the Axios instance and event emitter. SDK interceptors handle response unwrapping, auth error events, and retry with exponential backoff.

## Commands

All commands run from the **project root**.

| Command | What it does |
|---|---|
| `bun run dev` | Start all apps in dev/watch mode (via Turbo) |
| `bun run build` | Build all packages and apps (via Turbo) |
| `bun run lint` | Lint all packages with Biome (via Turbo) |
| `bun run typecheck` | Type-check all packages with `tsc --noEmit` (via Turbo) |
| `bun run test` | Run tests across the monorepo (via Turbo) |
| `bun run format` | Format + auto-fix all files with Biome |
| `bun run clean` | Remove node_modules and lock files |

To run a command for a **single package**, use Turbo filtering:

```bash
bunx turbo test --filter=@locusai/api
bunx turbo typecheck --filter=@locusai/web
```

Or run directly inside the package directory:

```bash
cd apps/api && bun run test
```

## Coding Style

### General Conventions

- **Named exports only** — no default exports (except config/entry files).
- **Barrel files** (`index.ts`) for re-exporting from directories.
- **PascalCase** for classes and types: `UserService`, `AuthenticatedUser`.
- **camelCase** for functions and variables: `findByEmail`, `workspaceId`.
- **UPPER_SNAKE_CASE** for constants: `IS_PUBLIC_KEY`, `THROTTLE_TTL`.
- **File naming**: `kebab-case` — `auth.service.ts`, `all-exceptions.filter.ts`, `api-key.entity.ts`.
- Path alias `@/*` maps to `./src/*` in each app/package.

### TypeScript

- Strict mode enabled globally via `tsconfig.base.json`.
- Base config: `target: ESNext`, `module: ESNext`, `moduleResolution: bundler`.
- API overrides to `module: CommonJS` for NestJS compatibility.
- Decorators enabled (`experimentalDecorators`, `emitDecoratorMetadata`).
- Prefer Zod schema inference (`z.infer<typeof Schema>`) over manual interfaces.

### Biome (Formatting & Linting)

Biome replaces both ESLint and Prettier. Configuration lives in root `biome.json`.

**Formatting rules:**
- 2-space indentation, LF line endings, 80-char line width.
- Double quotes, ES5 trailing commas, always semicolons.
- Arrow function parentheses always required.

**Key linter rules:**
- `noExplicitAny: error` — use typed alternatives (relaxed to `off` in test files).
- `noNonNullAssertion: error` — avoid `!` operator (relaxed to `off` in test files).
- `noUnusedImports: error`, `noUnusedVariables: error`.
- `noParameterAssign: error`.
- Organize imports automatically via `assist.actions.source.organizeImports`.

**Run formatting:**
```bash
bun run format
```

### Error Handling

- Use NestJS built-in exceptions: `UnauthorizedException`, `NotFoundException`, `ConflictException`, `BadRequestException`.
- Global `AllExceptionsFilter` catches everything and wraps in a standard `ApiResponse` envelope.
- Sensitive fields (`otp`, `password`, `token`, `apiKey`) are sanitized before logging.
- Zod validation errors use `z.treeifyError()` for structured error details.

### Async Patterns

- Always use `async/await` — no `.then()` chains.
- Database transactions via `this.dataSource.transaction(async (manager) => { ... })`.
- SDK has `withRetry()` utility with exponential backoff for resilient HTTP calls.

### Dependency Injection (NestJS)

- Constructor injection with `private readonly`:
  ```typescript
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}
  ```
- Guards compose via decorators: `@UseGuards(GoogleAuthGuard)`.
- Custom decorators for metadata: `@Public()`, `@SkipSanitize()`, `@CurrentUser()`, `@MembershipRoles()`.

### Zod Schema Patterns

Schemas are defined in `packages/shared/src/models/` and serve as the single source of truth for types:

```typescript
// Define schema
export const OtpRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Infer type
export type OtpRequest = z.infer<typeof OtpRequestSchema>;

// Discriminated unions for polymorphic types
export const AuthenticatedUserSchema = z.discriminatedUnion("authType", [
  JwtAuthUserSchema,
  ApiKeyAuthUserSchema,
]);

// Type guards as standalone functions
export function isJwtUser(user: AuthenticatedUser): user is JwtAuthUser {
  return user.authType === "jwt";
}
```

### Entity Definitions (TypeORM)

Entities use TypeORM decorators with explicit column names:

```typescript
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "avatar_url", nullable: true })
  avatarUrl: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
```

- Column names use `snake_case` in the database, `camelCase` in TypeScript.
- All timestamps are `timestamptz` with `@CreateDateColumn` / `@UpdateDateColumn`.
- UUIDs for primary keys.

## Testing

### Framework & Configuration

- **Jest 29** with **@swc/jest** for fast TypeScript transpilation.
- Config: `apps/api/jest.config.js`.
- Test regex: `.*\.jest\.ts$` — files are named `*.jest.ts` (not `.spec.ts` or `.test.ts`).
- Tests exist only in `apps/api` — other packages do not have tests yet.

### Test File Structure

Tests live in `__tests__/` directories alongside source modules:

```
apps/api/src/auth/
  auth.service.ts
  auth.controller.ts
  __tests__/
    auth.service.jest.ts
    auth.controller.jest.ts
```

### Writing a Test

Every test file starts with these two imports **before anything else**:

```typescript
import "reflect-metadata";
import "../../test-setup";  // Mocks TypeORM entities to avoid circular deps
```

Then follows the standard pattern:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,  // The real service under test
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
  });

  it("should do something", async () => {
    // Arrange
    usersService.findByEmail.mockResolvedValue(mockUser);

    // Act
    const result = await service.someMethod();

    // Assert
    expect(result).toEqual(expectedValue);
  });
});
```

### Mocking Patterns

- **Services**: `useValue` with `jest.fn()` for each method.
- **Repositories**: `useValue` with `getRepositoryToken(Entity)` as the provide token.
- **Factory mocks** for complex setups: `useFactory: () => ({ ... })`.
- **Environment variables**: snapshot and restore `process.env` in `beforeEach`/`afterEach`.

### Test Setup File (`apps/api/src/test-setup.ts`)

Mocks all TypeORM entity imports to prevent circular dependency issues:

```typescript
jest.mock("@/entities", () => ({
  User: class {},
  Organization: class {},
  Workspace: class {},
  Membership: class {},
  ApiKey: class {},
}));

jest.mock("@/entities/api-key.entity", () => ({ ApiKey: class {} }));
// ... each entity individually
```

### Running Tests

```bash
# All tests (via Turbo)
bun run test

# API tests only
bunx turbo test --filter=@locusai/api

# Single test file
cd apps/api && bunx jest src/auth/__tests__/auth.service.jest.ts

# With coverage
cd apps/api && bunx jest --coverage
```

## Key Decisions

1. **Biome over ESLint + Prettier** — Single tool for linting and formatting. Faster, simpler config, fewer dependencies.

2. **Zod as the single source of truth for types** — Schemas defined in `@locusai/shared` provide both runtime validation and TypeScript types via `z.infer`. No separate interface files.

3. **Bun as package manager and bundler** — Used for workspace management, dependency installation, and building CLI/SDK packages. NestJS still runs on Node.js.

4. **Jest test files use `.jest.ts` suffix** — Distinguishes test files from other `.ts` files and avoids conflicts with potential Vitest or other test runner files.

5. **TypeORM with explicit snake_case column mapping** — Database columns use `snake_case`, TypeScript properties use `camelCase`, mapped via `{ name: "column_name" }`.

6. **Centralized exception handling** — A single `AllExceptionsFilter` standardizes all API error responses into the `ApiResponse` envelope format.

7. **API key authentication alongside JWT** — Dual auth strategy: JWT for web dashboard users, API keys for CLI/agent access. Discriminated union type (`authType: "jwt" | "api_key"`) distinguishes them.

8. **Turborepo for task orchestration** — All tasks (`build`, `test`, `lint`, `typecheck`) go through Turbo with dependency-aware execution and caching.

9. **SDK uses module composition** — Feature modules (`AuthModule`, `TasksModule`) compose into `LocusClient` rather than one monolithic class. Each module gets the shared Axios instance.

10. **Web dashboard bundled into CLI** — `build:cli` copies the Next.js static export into `packages/cli/public/dashboard/` so the CLI can serve the dashboard locally.

## Feature Areas

- **Auth** — OTP-based email auth, Google OAuth, JWT tokens, API key management, IP reputation tracking
- **Organizations** — Multi-tenant org management with memberships and roles
- **Workspaces** — Project workspaces within organizations
- **Tasks** — Task CRUD with status tracking and sprint assignment
- **Sprints** — Sprint management with task grouping
- **CI** — CI/CD pipeline integration and status tracking
- **Docs** — Documentation management within workspaces
- **Events** — Event logging and audit trail
- **Invitations** — Team invitation system with email delivery
- **Config** — Typed configuration with Zod validation and security checks
