---
name: error-handling
description: Implement robust error handling with custom error types, proper propagation, user-friendly messages, and logging. Use when adding error handling to APIs, libraries, or applications.
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
tags: [errors, error-handling, exceptions, logging, validation, resilience, fault-tolerance]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Error Handling

## When to use this skill
- Building or improving error handling in an API
- Adding proper error responses to endpoints
- Creating custom error classes
- Setting up global error handling
- Adding retry logic or circuit breakers
- Improving error messages and logging

## Custom error classes

### TypeScript

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 'NOT_FOUND', 404);
  }
}

class ValidationError extends AppError {
  constructor(errors: { field: string; message: string }[]) {
    super('Validation failed', 'VALIDATION_ERROR', 400, { errors });
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}
```

### Python

```python
class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 500, details: dict = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.details = details or {}

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(f"{resource} with id '{id}' not found", "NOT_FOUND", 404)

class ValidationError(AppError):
    def __init__(self, errors: list[dict]):
        super().__init__("Validation failed", "VALIDATION_ERROR", 400, {"errors": errors})
```

## Global error handler

### Express.js

```typescript
// Error handler middleware (must be last)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: err.issues,
      },
    });
  }

  // Unknown errors — log full details, return generic message
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});
```

### FastAPI (Python)

```python
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": str(exc), **exc.details}},
    )
```

## Error handling patterns

### Never swallow errors silently

```typescript
// BAD: Error disappears
try {
  await saveData(data);
} catch (e) {
  // silently ignored
}

// GOOD: Handle or propagate
try {
  await saveData(data);
} catch (e) {
  logger.error('Failed to save data', { error: e, data });
  throw new AppError('Failed to save', 'SAVE_FAILED', 500);
}
```

### Fail fast on invalid input

```typescript
function createUser(input: unknown) {
  const parsed = CreateUserSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map(i => ({ field: String(i.path[0]), message: i.message }))
    );
  }
  // proceed with valid data
  return db.users.create(parsed.data);
}
```

### Retry with exponential backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// Usage
const data = await withRetry(() => fetch('https://api.example.com/data'));
```

### Wrap external errors

```typescript
// Translate third-party errors into your domain
async function getUser(id: string): Promise<User> {
  try {
    return await externalApi.fetchUser(id);
  } catch (error) {
    if (error.response?.status === 404) {
      throw new NotFoundError('User', id);
    }
    throw new AppError(
      'Failed to fetch user from external service',
      'EXTERNAL_SERVICE_ERROR',
      502,
    );
  }
}
```

## Logging best practices

```typescript
// Structured logging
logger.error('Order creation failed', {
  orderId: order.id,
  userId: order.userId,
  error: err.message,
  stack: err.stack,
});

// Log levels
logger.debug('...');  // Development details
logger.info('...');   // Normal operations (request received, job completed)
logger.warn('...');   // Recoverable issues (retry succeeded, deprecated usage)
logger.error('...');  // Failures that need attention
```

## Unhandled rejection / uncaught exception

```typescript
// Node.js — catch-all safety net
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});
```

## Checklist

- [ ] Custom error classes for different failure types
- [ ] Global error handler catches all errors
- [ ] Known errors return appropriate HTTP status codes
- [ ] Unknown errors return 500 with generic message (no stack traces to client)
- [ ] All errors are logged with context
- [ ] Input validation at system boundaries
- [ ] External service errors wrapped in domain errors
- [ ] No silently swallowed errors
- [ ] Retry logic for transient failures
- [ ] Unhandled rejection / uncaught exception handlers
