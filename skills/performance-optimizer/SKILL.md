---
name: performance-optimizer
description: Profile, diagnose, and fix performance bottlenecks in applications. Use when optimizing slow queries, reducing load times, improving runtime performance, or reducing memory usage.
allowed-tools: [Read, Grep, Glob, Bash]
tags: [performance, optimization, profiling, caching, database, memory, latency, speed]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Performance Optimizer

## When to use this skill
- Application or endpoint is slow
- Database queries taking too long
- High memory usage or memory leaks
- Frontend load times need improvement
- Need to handle higher throughput
- Optimizing build or CI/CD times

## Step 1: Measure first

**Never optimize without measuring.** Identify the actual bottleneck.

### Backend profiling

```bash
# Node.js — CPU profile
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# Node.js — built-in profiler
node --inspect app.js  # Then open chrome://inspect

# Python — cProfile
python -m cProfile -s cumtime app.py
python -m cProfile -o output.prof app.py  # Save for analysis

# HTTP endpoint timing
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/users
# curl-format.txt contains: time_total, time_connect, time_starttransfer
```

### Database profiling

```sql
-- PostgreSQL: Identify slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Explain a slow query
EXPLAIN ANALYZE SELECT * FROM orders
WHERE user_id = 123 AND status = 'active'
ORDER BY created_at DESC;
```

### Frontend profiling

```bash
# Lighthouse CLI
npx lighthouse http://localhost:3000 --output=json --output-path=./report.json

# Bundle size analysis
npx webpack-bundle-analyzer stats.json
npx vite-bundle-visualizer
```

## Step 2: Common bottlenecks and fixes

### N+1 queries

```typescript
// BAD: N+1 — one query per user
const users = await db.query('SELECT * FROM users');
for (const user of users) {
  user.orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
}

// GOOD: 2 queries total
const users = await db.query('SELECT * FROM users');
const userIds = users.map(u => u.id);
const orders = await db.query('SELECT * FROM orders WHERE user_id = ANY($1)', [userIds]);
const ordersByUser = groupBy(orders, 'user_id');
users.forEach(u => u.orders = ordersByUser[u.id] ?? []);
```

### Missing database indexes

```sql
-- Find sequential scans (missing indexes)
SELECT relname, seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC;

-- Add index for common queries
CREATE INDEX CONCURRENTLY idx_orders_user_status
ON orders (user_id, status);
```

### Unnecessary re-renders (React)

```typescript
// BAD: New object every render
<Component style={{ color: 'red' }} />
<Component data={items.filter(i => i.active)} />

// GOOD: Memoize
const style = useMemo(() => ({ color: 'red' }), []);
const activeItems = useMemo(() => items.filter(i => i.active), [items]);
<Component style={style} />
<Component data={activeItems} />

// Memoize expensive child components
const ExpensiveChild = React.memo(({ data }) => {
  // expensive render
});
```

### Large payloads

```typescript
// BAD: Return everything
app.get('/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users'); // 50 columns
  res.json(users); // 10MB response
});

// GOOD: Select needed fields, paginate
app.get('/users', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const users = await db.query(
    'SELECT id, name, email FROM users LIMIT $1 OFFSET $2',
    [limit, (page - 1) * limit]
  );
  res.json({ data: users, meta: { page, limit } });
});
```

### Caching

```typescript
// In-memory cache for expensive computations
const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string, ttlMs: number, compute: () => T): T {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const data = compute();
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

// Redis for distributed caching
const cached = await redis.get(`user:${id}`);
if (cached) return JSON.parse(cached);
const user = await db.getUser(id);
await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
```

### Async operations

```typescript
// BAD: Sequential when independent
const users = await getUsers();
const orders = await getOrders();
const products = await getProducts();

// GOOD: Parallel when independent
const [users, orders, products] = await Promise.all([
  getUsers(),
  getOrders(),
  getProducts(),
]);
```

## Step 3: Verify improvement

```bash
# Before/after benchmarks
hyperfine 'curl http://localhost:3000/api/users' --warmup 3

# Load testing
npx autocannon -c 100 -d 30 http://localhost:3000/api/users
ab -n 1000 -c 50 http://localhost:3000/api/users
```

## Checklist

- [ ] Bottleneck identified through profiling (not guessing)
- [ ] Optimization targets the actual bottleneck
- [ ] Before/after measurements documented
- [ ] No correctness sacrificed for speed
- [ ] Caching has proper invalidation
- [ ] Database queries use appropriate indexes
- [ ] No N+1 query patterns
- [ ] Large datasets are paginated
- [ ] Independent async operations run in parallel
- [ ] Tests still pass after optimization
