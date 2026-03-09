---
name: api-design
description: Design and implement RESTful APIs with proper routing, validation, error handling, and documentation. Use when building new API endpoints, designing API architecture, or improving existing APIs.
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
tags: [api, rest, graphql, endpoints, http, routing, validation, openapi]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# API Design

## When to use this skill
- Designing new API endpoints
- Adding routes to an existing API
- Improving API error handling or validation
- Documenting APIs (OpenAPI/Swagger)
- Reviewing API design for best practices

## RESTful conventions

### URL structure
```
GET    /users          → List users
POST   /users          → Create user
GET    /users/:id      → Get single user
PUT    /users/:id      → Replace user
PATCH  /users/:id      → Partial update
DELETE /users/:id      → Delete user

GET    /users/:id/orders    → List user's orders (nested resource)
POST   /users/:id/orders    → Create order for user
```

### Naming rules
- **Plural nouns** for resources: `/users` not `/user`
- **Kebab-case** for multi-word: `/order-items` not `/orderItems`
- **No verbs in URLs**: `POST /users` not `POST /createUser`
- **Nest logically**: Max 2 levels deep, then use query params

### HTTP status codes

| Code | When to use |
|------|-------------|
| `200` | Success (GET, PUT, PATCH) |
| `201` | Created (POST) |
| `204` | No content (DELETE) |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (no/invalid auth) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not found |
| `409` | Conflict (duplicate, state conflict) |
| `422` | Unprocessable entity (semantic error) |
| `429` | Too many requests (rate limit) |
| `500` | Internal server error |

## Request/Response patterns

### Consistent response envelope

```json
// Success
{
  "data": { "id": 1, "name": "Alice" },
  "meta": { "requestId": "abc-123" }
}

// List with pagination
{
  "data": [{ "id": 1 }, { "id": 2 }],
  "meta": {
    "total": 45,
    "page": 1,
    "perPage": 20,
    "totalPages": 3
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Must be a valid email" }
    ]
  }
}
```

### Pagination

```
GET /users?page=2&per_page=20        # Offset-based
GET /users?cursor=eyJpZCI6MTB9&limit=20  # Cursor-based (preferred for large datasets)
```

### Filtering and sorting

```
GET /users?status=active&role=admin  # Filter
GET /users?sort=-created_at,name     # Sort (- prefix = descending)
GET /users?fields=id,name,email      # Sparse fields
GET /users?search=alice              # Full-text search
```

## Input validation

```typescript
// Zod schema (TypeScript)
const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
  age: z.number().int().min(18).optional(),
});

// Validate in handler
app.post('/users', async (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: result.error.issues,
      },
    });
  }
  const user = await createUser(result.data);
  res.status(201).json({ data: user });
});
```

## Authentication patterns

```typescript
// Bearer token middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN' } });
  }
}

// Role-based authorization
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }
    next();
  };
}

app.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
```

## Versioning

```
# URL path (most common)
/api/v1/users
/api/v2/users

# Header-based
Accept: application/vnd.myapi.v2+json
```

## Rate limiting headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1620000000
Retry-After: 60
```

## Checklist

- [ ] RESTful URL structure with plural nouns
- [ ] Correct HTTP methods and status codes
- [ ] Consistent response format (envelope)
- [ ] Input validation on all endpoints
- [ ] Authentication and authorization
- [ ] Pagination for list endpoints
- [ ] Error responses with machine-readable codes
- [ ] Rate limiting considered
- [ ] API versioning strategy
- [ ] Idempotent PUT/DELETE operations
