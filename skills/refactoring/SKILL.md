---
name: refactoring
description: Improve code structure without changing behavior using proven refactoring patterns. Use when cleaning up code, reducing duplication, improving readability, or restructuring modules.
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
tags: [refactoring, clean-code, code-quality, design-patterns, maintainability, technical-debt]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Refactoring

## When to use this skill
- Code is hard to read or understand
- Duplicated logic across multiple places
- Functions or classes are too large
- Adding a feature requires touching too many files
- Code smells identified during review
- Preparing code for a new feature

## Golden rule

**Refactoring must not change behavior.** Tests should pass before and after. If no tests exist, write them first.

```bash
# Run tests before starting
npm test  # or pytest, go test, etc.
# Make refactoring changes
# Run tests after every change
npm test
```

## Common refactoring patterns

### Extract function
When a block of code does one distinct thing:

```typescript
// Before
function processOrder(order: Order) {
  // validate
  if (!order.items.length) throw new Error('Empty order');
  if (order.items.some(i => i.quantity <= 0)) throw new Error('Invalid quantity');
  if (!order.customerId) throw new Error('No customer');

  // calculate total
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }
  const tax = total * 0.1;
  const finalTotal = total + tax;

  // save
  db.save({ ...order, total: finalTotal });
}

// After
function validateOrder(order: Order): void {
  if (!order.items.length) throw new Error('Empty order');
  if (order.items.some(i => i.quantity <= 0)) throw new Error('Invalid quantity');
  if (!order.customerId) throw new Error('No customer');
}

function calculateTotal(items: OrderItem[]): number {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return subtotal * 1.1; // includes 10% tax
}

function processOrder(order: Order) {
  validateOrder(order);
  const total = calculateTotal(order.items);
  db.save({ ...order, total });
}
```

### Replace conditional with polymorphism

```typescript
// Before: switch on type
function calculateShipping(order: Order): number {
  switch (order.shippingType) {
    case 'standard': return order.weight * 1.5;
    case 'express': return order.weight * 3.0 + 10;
    case 'overnight': return order.weight * 5.0 + 25;
    default: throw new Error('Unknown shipping type');
  }
}

// After: strategy pattern
const shippingStrategies: Record<string, (weight: number) => number> = {
  standard: (weight) => weight * 1.5,
  express: (weight) => weight * 3.0 + 10,
  overnight: (weight) => weight * 5.0 + 25,
};

function calculateShipping(order: Order): number {
  const strategy = shippingStrategies[order.shippingType];
  if (!strategy) throw new Error('Unknown shipping type');
  return strategy(order.weight);
}
```

### Remove duplication (DRY)

```typescript
// Before: repeated fetch + error handling
async function getUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getOrder(id: string) {
  const res = await fetch(`/api/orders/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// After: shared helper
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const getUser = (id: string) => apiGet<User>(`/users/${id}`);
const getOrder = (id: string) => apiGet<Order>(`/orders/${id}`);
```

### Simplify conditionals

```typescript
// Before: nested ifs
function getAccess(user: User): string {
  if (user.isActive) {
    if (user.isAdmin) {
      return 'full';
    } else {
      if (user.isPremium) {
        return 'premium';
      } else {
        return 'basic';
      }
    }
  } else {
    return 'none';
  }
}

// After: early returns
function getAccess(user: User): string {
  if (!user.isActive) return 'none';
  if (user.isAdmin) return 'full';
  if (user.isPremium) return 'premium';
  return 'basic';
}
```

### Rename for clarity

```typescript
// Before: unclear names
const d = new Date();
const t = d.getTime() - s.getTime();
const r = t > 86400000;

// After: intention-revealing names
const now = new Date();
const elapsedMs = now.getTime() - sessionStart.getTime();
const isExpired = elapsedMs > ONE_DAY_MS;
```

### Inline unnecessary abstractions

```typescript
// Before: abstraction adds no value
class StringUtils {
  static isEmpty(s: string): boolean {
    return s.length === 0;
  }
}
if (StringUtils.isEmpty(name)) { ... }

// After: direct and clear
if (name.length === 0) { ... }
// or
if (!name) { ... }
```

## Refactoring workflow

1. **Ensure tests pass** — run the full suite first
2. **Make one small change** — one pattern at a time
3. **Run tests** — verify nothing broke
4. **Commit** — each refactoring step is a separate commit
5. **Repeat** — next small change

## When NOT to refactor

- In the same PR as a feature change (separate concerns)
- Without tests covering the code
- Code that's about to be deleted
- Premature: 2 copies is fine, 3 copies is time to refactor
- Cosmetic-only changes that don't improve readability

## Checklist

- [ ] Tests pass before starting
- [ ] Each change is small and atomic
- [ ] Tests pass after each change
- [ ] No behavior changes introduced
- [ ] Code is genuinely easier to read/maintain
- [ ] No premature abstractions added
- [ ] Debug/temporary code removed
