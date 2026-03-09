---
name: test-generator
description: Generate comprehensive unit, integration, and end-to-end tests. Use when adding test coverage, writing tests for new features, or improving existing test suites.
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
tags: [testing, unit-tests, integration-tests, e2e, jest, vitest, pytest, coverage]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Test Generator

## When to use this skill
- Adding test coverage to existing code
- Writing tests for a new feature
- Generating edge case tests
- Setting up a test suite from scratch
- Improving test quality or coverage

## Step 1: Understand the testing environment

Before writing tests, identify the project's test setup:

```bash
# Check for test config files
ls jest.config* vitest.config* pytest.ini setup.cfg pyproject.toml .mocharc* 2>/dev/null

# Check package.json test scripts
grep -A 5 '"test"' package.json

# Find existing test files for patterns
find . -name "*.test.*" -o -name "*.spec.*" -o -name "test_*" | head -20
```

## Step 2: Read the source code

Read the code you're testing thoroughly:
- **Inputs**: What parameters does the function accept?
- **Outputs**: What does it return or produce?
- **Side effects**: Does it write to DB, call APIs, modify state?
- **Error paths**: When does it throw or return errors?
- **Edge cases**: Empty inputs, null, boundaries, concurrency

## Step 3: Write tests following existing patterns

### Test structure (Arrange-Act-Assert)

```typescript
// TypeScript/Jest/Vitest
describe('calculateDiscount', () => {
  it('should apply percentage discount to total', () => {
    // Arrange
    const items = [{ price: 100 }, { price: 50 }];
    const discountPercent = 10;

    // Act
    const result = calculateDiscount(items, discountPercent);

    // Assert
    expect(result).toBe(135);
  });

  it('should return original total when discount is 0', () => {
    const items = [{ price: 100 }];
    expect(calculateDiscount(items, 0)).toBe(100);
  });

  it('should throw when discount exceeds 100%', () => {
    expect(() => calculateDiscount([{ price: 100 }], 150))
      .toThrow('Discount cannot exceed 100%');
  });
});
```

```python
# Python/pytest
class TestCalculateDiscount:
    def test_applies_percentage_discount(self):
        items = [{"price": 100}, {"price": 50}]
        assert calculate_discount(items, 10) == 135

    def test_zero_discount_returns_original(self):
        items = [{"price": 100}]
        assert calculate_discount(items, 0) == 100

    def test_raises_on_excessive_discount(self):
        with pytest.raises(ValueError, match="cannot exceed 100%"):
            calculate_discount([{"price": 100}], 150)
```

## Step 4: Cover all test categories

### Happy path
- Normal inputs produce expected outputs
- All valid input types are covered

### Edge cases
- Empty arrays/strings/objects
- Single element collections
- Zero, negative, very large numbers
- Unicode, special characters
- Boundary values (min, max, off-by-one)

### Error cases
- Invalid input types
- Null/undefined/None values
- Missing required fields
- Network failures (for async code)
- Timeout scenarios

### Async code
```typescript
it('should fetch user data', async () => {
  const user = await getUser('user-123');
  expect(user.name).toBe('Alice');
});

it('should handle API errors gracefully', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'));
  await expect(getUser('user-123')).rejects.toThrow('Network error');
});
```

## Step 5: Mock external dependencies

```typescript
// Mock modules
jest.mock('./database');
vi.mock('./api-client');

// Mock specific functions
const mockSave = jest.fn().mockResolvedValue({ id: 1 });
const mockFetch = vi.fn().mockResolvedValue({ data: [] });

// Mock timers
jest.useFakeTimers();
vi.useFakeTimers();
```

```python
# Python mocking
from unittest.mock import patch, MagicMock

@patch('mymodule.database.save')
def test_creates_user(mock_save):
    mock_save.return_value = {"id": 1}
    result = create_user("Alice")
    mock_save.assert_called_once_with({"name": "Alice"})
```

## Test naming conventions

- **Describe what**, not how: `it('should reject expired tokens')` not `it('checks token date')`
- **Use natural language**: `it('should return empty array when no results found')`
- **Group by function**: `describe('UserService.create', () => { ... })`

## Checklist

- [ ] Tests follow existing patterns in the project
- [ ] Happy path covered
- [ ] Edge cases covered (empty, null, boundaries)
- [ ] Error cases covered
- [ ] Async code properly awaited
- [ ] External dependencies mocked
- [ ] Tests are independent (no shared mutable state)
- [ ] Tests run fast (no unnecessary I/O)
- [ ] Test names clearly describe the behavior
- [ ] All tests pass: `npm test` / `pytest`
