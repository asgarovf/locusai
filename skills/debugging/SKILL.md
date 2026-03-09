---
name: debugging
description: Systematically diagnose and fix bugs using structured debugging techniques. Use when investigating errors, unexpected behavior, failing tests, or production issues.
allowed-tools: [Read, Grep, Glob, Bash]
tags: [debugging, errors, troubleshooting, logs, stack-trace, bugs, diagnostics]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Debugging

## When to use this skill
- Investigating error messages or stack traces
- Diagnosing unexpected behavior
- Fixing failing tests
- Debugging production issues
- Understanding why code doesn't work as expected

## Step 1: Reproduce the problem

Before fixing anything, confirm you can reproduce it:

```bash
# Run the failing command/test
npm test -- --grep "failing test name"
pytest -xvs test_file.py::test_name

# Check error logs
tail -100 logs/error.log
docker compose logs app --tail 100
```

Key questions:
- **What** exactly is the error? (exact message, stack trace)
- **When** did it start? (recent commit, dependency update?)
- **Where** does it happen? (specific input, environment, timing?)
- **How often?** (every time, intermittent, under load?)

## Step 2: Read the error carefully

```
TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:15:23)
    at renderWithHooks (node_modules/react-dom/...)
```

Parse the stack trace:
1. **Error type**: `TypeError` — wrong type, likely null/undefined
2. **Message**: `Cannot read properties of undefined` — something is undefined
3. **Property**: `reading 'map'` — trying to call `.map()` on undefined
4. **Location**: `UserList.tsx:15` — exact file and line
5. **Context**: React component render — data likely not loaded yet

## Step 3: Narrow the scope

### Binary search approach
If you don't know where the bug is, bisect:

```bash
# Git bisect to find the breaking commit
git bisect start
git bisect bad          # Current commit is broken
git bisect good abc123  # This commit was working
# Git will checkout middle commits — test each one
git bisect run npm test
```

### Isolate variables
- Does it fail with minimal input?
- Does it fail in a fresh environment?
- Does it fail without feature flags / config?
- Does it fail with the previous version of dependencies?

## Step 4: Inspect state

### Check the data
```bash
# Search for where the variable is set
grep -rn "userData\s*=" --include="*.ts" src/

# Check database state
psql -c "SELECT * FROM users WHERE id = 123"

# Check API response
curl -s http://localhost:3000/api/users/123 | jq .
```

### Add targeted logging
```typescript
// Temporary debug logging — REMOVE before committing
console.log('[DEBUG] userData:', JSON.stringify(userData, null, 2));
console.log('[DEBUG] typeof userData:', typeof userData);
console.log('[DEBUG] userData keys:', Object.keys(userData ?? {}));
```

```python
import logging
logger = logging.getLogger(__name__)
logger.debug(f"user_data: {user_data!r}")
logger.debug(f"type: {type(user_data)}, len: {len(user_data) if user_data else 'N/A'}")
```

## Step 5: Common bug patterns

### Null/undefined access
```typescript
// Bug: data might not be loaded yet
const names = users.map(u => u.name);

// Fix: guard against undefined
const names = (users ?? []).map(u => u.name);
```

### Async timing
```typescript
// Bug: not awaiting async operation
const data = fetchData(); // Returns Promise, not data
console.log(data.length); // undefined

// Fix: await the promise
const data = await fetchData();
```

### Stale closure
```typescript
// Bug: useEffect captures stale count
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1); // count is always 0
  }, 1000);
  return () => clearInterval(interval);
}, []);

// Fix: use functional update
setCount(prev => prev + 1);
```

### Off-by-one
```typescript
// Bug: skips last element
for (let i = 0; i < arr.length - 1; i++) { ... }

// Fix: include last element
for (let i = 0; i < arr.length; i++) { ... }
```

### Race condition
```typescript
// Bug: two requests, wrong order
fetchUser(1).then(setUser);  // slow
fetchUser(2).then(setUser);  // fast — finishes first, then gets overwritten

// Fix: cancel stale requests
const controller = new AbortController();
fetchUser(id, { signal: controller.signal }).then(setUser);
return () => controller.abort();
```

## Step 6: Verify the fix

1. **Reproduce** the original bug one more time
2. **Apply** the fix
3. **Verify** the bug is gone
4. **Check** that no other tests broke
5. **Test** edge cases related to the fix
6. **Remove** all debug logging

```bash
# Run the specific failing test
npm test -- --grep "the test that was failing"

# Run the full suite to check for regressions
npm test

# If applicable, test the specific scenario manually
curl -X POST http://localhost:3000/api/users -d '{"name": "test"}'
```

## Debugging checklist

- [ ] Error message and stack trace read carefully
- [ ] Bug reproduced reliably
- [ ] Scope narrowed to specific file/function
- [ ] Root cause identified (not just symptoms)
- [ ] Fix addresses root cause
- [ ] No regression in existing tests
- [ ] Debug logging removed
- [ ] Edge cases around the fix tested
