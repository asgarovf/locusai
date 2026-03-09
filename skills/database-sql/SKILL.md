---
name: database-sql
description: Design database schemas, write efficient SQL queries, create migrations, and optimize database performance. Use when working with databases, writing queries, or designing data models.
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
tags: [database, sql, postgresql, mysql, migrations, schema, queries, orm, data-modeling]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Database & SQL

## When to use this skill
- Designing a database schema
- Writing or optimizing SQL queries
- Creating database migrations
- Setting up an ORM (Prisma, Drizzle, TypeORM, SQLAlchemy)
- Debugging query performance
- Adding indexes

## Schema design principles

### Naming conventions
- **Tables**: plural, snake_case — `users`, `order_items`
- **Columns**: snake_case — `created_at`, `first_name`
- **Primary keys**: `id` (auto-increment or UUID)
- **Foreign keys**: `<singular_table>_id` — `user_id`, `order_id`
- **Indexes**: `idx_<table>_<columns>` — `idx_users_email`
- **Booleans**: `is_` or `has_` prefix — `is_active`, `has_verified`

### Common patterns

```sql
-- Standard table template
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table for many-to-many
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

-- Soft delete pattern
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_users_active ON users (id) WHERE deleted_at IS NULL;
```

### Data types guide

| Use case | PostgreSQL | MySQL |
|----------|-----------|-------|
| Primary key | `UUID` or `BIGSERIAL` | `BIGINT AUTO_INCREMENT` |
| Short text | `VARCHAR(n)` | `VARCHAR(n)` |
| Long text | `TEXT` | `TEXT` |
| Currency | `NUMERIC(12,2)` | `DECIMAL(12,2)` |
| Timestamps | `TIMESTAMPTZ` | `DATETIME` |
| JSON | `JSONB` | `JSON` |
| Booleans | `BOOLEAN` | `TINYINT(1)` |
| Enums | `VARCHAR` + CHECK | `ENUM(...)` |

## Migrations

### Prisma

```prisma
// schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  orders    Order[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Order {
  id        String      @id @default(uuid())
  userId    String      @map("user_id")
  user      User        @relation(fields: [userId], references: [id])
  status    OrderStatus @default(PENDING)
  total     Decimal     @db.Decimal(12, 2)
  createdAt DateTime    @default(now()) @map("created_at")

  @@index([userId])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

```bash
# Generate and apply migration
npx prisma migrate dev --name add_orders_table
npx prisma generate
```

### Raw SQL migration

```sql
-- migrations/001_create_users.up.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- migrations/001_create_users.down.sql
DROP TABLE IF EXISTS users;
```

## Query patterns

### Pagination

```sql
-- Offset-based (simple, but slow for large offsets)
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;

-- Cursor-based (performant for large datasets)
SELECT * FROM users
WHERE created_at < $1  -- cursor from previous page
ORDER BY created_at DESC
LIMIT 20;
```

### Aggregation

```sql
-- Order summary by status
SELECT
    status,
    COUNT(*) AS count,
    SUM(total) AS revenue,
    AVG(total) AS avg_order
FROM orders
WHERE created_at >= now() - INTERVAL '30 days'
GROUP BY status
ORDER BY revenue DESC;
```

### Common Table Expressions (CTEs)

```sql
-- Readable complex queries with CTEs
WITH monthly_revenue AS (
    SELECT
        date_trunc('month', created_at) AS month,
        SUM(total) AS revenue
    FROM orders
    WHERE status = 'DELIVERED'
    GROUP BY month
),
growth AS (
    SELECT
        month,
        revenue,
        LAG(revenue) OVER (ORDER BY month) AS prev_revenue
    FROM monthly_revenue
)
SELECT
    month,
    revenue,
    ROUND((revenue - prev_revenue) / prev_revenue * 100, 1) AS growth_pct
FROM growth
ORDER BY month DESC;
```

### Upsert

```sql
-- PostgreSQL
INSERT INTO users (email, name)
VALUES ('alice@example.com', 'Alice')
ON CONFLICT (email)
DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- MySQL
INSERT INTO users (email, name)
VALUES ('alice@example.com', 'Alice')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

## Indexing strategy

```sql
-- Single column (most common queries)
CREATE INDEX idx_users_email ON users (email);

-- Composite (multi-column WHERE clauses)
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
-- Rule: put equality columns first, range columns last

-- Partial index (subset of rows)
CREATE INDEX idx_orders_pending ON orders (created_at)
WHERE status = 'PENDING';

-- CONCURRENTLY (no table lock in production)
CREATE INDEX CONCURRENTLY idx_users_name ON users (name);
```

### When to add indexes
- Columns in WHERE clauses used frequently
- Columns in JOIN conditions
- Columns in ORDER BY (if not already covered)
- Foreign key columns

### When NOT to index
- Small tables (< 1000 rows)
- Columns with very low cardinality (booleans)
- Tables with heavy write load and few reads

## Performance debugging

```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = $1 AND status = 'active';

-- Look for:
-- Seq Scan → missing index
-- Nested Loop → potential N+1
-- Sort → missing index for ORDER BY
-- High "actual time" → slow operation
```

## Checklist

- [ ] Tables follow naming conventions
- [ ] Primary keys and foreign keys defined
- [ ] Appropriate data types chosen
- [ ] NOT NULL constraints where appropriate
- [ ] Indexes on frequently queried columns
- [ ] Foreign keys have ON DELETE behavior
- [ ] Migrations are reversible (up + down)
- [ ] Queries use parameterized values (no interpolation)
- [ ] Large result sets are paginated
- [ ] Query performance checked with EXPLAIN ANALYZE
