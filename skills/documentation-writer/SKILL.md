---
name: documentation-writer
description: Write clear technical documentation including READMEs, API docs, architecture guides, and inline documentation. Use when creating or improving project documentation.
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
tags: [documentation, readme, api-docs, technical-writing, jsdoc, docstrings, guides]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Documentation Writer

## When to use this skill
- Writing or improving a README
- Documenting API endpoints
- Creating architecture or design docs
- Writing setup/installation guides
- Adding JSDoc/docstrings to code
- Creating migration guides for breaking changes

## README structure

A good README answers: **What is this? How do I use it? How do I contribute?**

```markdown
# Project Name

Brief description (1-2 sentences). What does it do and who is it for?

## Quick Start

\`\`\`bash
npm install project-name
\`\`\`

\`\`\`typescript
import { something } from 'project-name';
const result = something('hello');
\`\`\`

## Features

- Feature one — brief explanation
- Feature two — brief explanation
- Feature three — brief explanation

## Installation

\`\`\`bash
# npm
npm install project-name

# yarn
yarn add project-name
\`\`\`

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14

## Usage

### Basic usage
[Code example with explanation]

### Configuration
[Configuration options with defaults]

### Advanced usage
[More complex examples]

## API Reference

### `functionName(param1, param2)`

Description of what the function does.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `param1` | `string` | — | Description |
| `param2` | `number` | `10` | Description |

**Returns:** `Promise<Result>` — Description

**Example:**
\`\`\`typescript
const result = await functionName('hello', 5);
\`\`\`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | `3000` | Server port |
| `LOG_LEVEL` | No | `info` | Logging level |

## Development

\`\`\`bash
git clone https://github.com/org/repo.git
cd repo
npm install
npm run dev
\`\`\`

### Running tests
\`\`\`bash
npm test
npm run test:coverage
\`\`\`

## Contributing

[Brief contribution guidelines or link to CONTRIBUTING.md]

## License

[License type] — see [LICENSE](LICENSE)
```

## API documentation

### OpenAPI / Swagger

```yaml
paths:
  /users:
    post:
      summary: Create a new user
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, email]
              properties:
                name:
                  type: string
                  example: "Alice"
                email:
                  type: string
                  format: email
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Validation error
```

### Inline API docs (JSDoc)

```typescript
/**
 * Creates a new user account.
 *
 * @param input - User creation data
 * @returns The created user with generated ID
 * @throws {ValidationError} If input fails validation
 * @throws {ConflictError} If email already exists
 *
 * @example
 * ```typescript
 * const user = await createUser({ name: 'Alice', email: 'alice@example.com' });
 * console.log(user.id); // "usr_abc123"
 * ```
 */
async function createUser(input: CreateUserInput): Promise<User> {
```

### Python docstrings

```python
def create_user(name: str, email: str) -> User:
    """Create a new user account.

    Args:
        name: The user's display name (1-100 characters).
        email: A valid email address. Must be unique.

    Returns:
        The created User object with generated ID.

    Raises:
        ValidationError: If name or email is invalid.
        ConflictError: If email already exists.

    Example:
        >>> user = create_user("Alice", "alice@example.com")
        >>> print(user.id)
        'usr_abc123'
    """
```

## Documentation principles

1. **Write for your audience**: Beginner guide ≠ API reference
2. **Start with examples**: Show, then explain
3. **Keep it current**: Outdated docs are worse than no docs
4. **Be concise**: Short paragraphs, bullet points, tables
5. **Use code blocks**: Always specify the language for syntax highlighting
6. **Document the why**: Comments explain *why*, not *what*

## When to add inline comments

```typescript
// GOOD: Explains non-obvious business logic
// Orders placed after 2pm EST ship next business day
const cutoffHour = 14;

// GOOD: Explains workaround
// setTimeout(0) needed because DOM hasn't updated yet after React state change
setTimeout(() => scrollToBottom(), 0);

// BAD: Restates the code
// Set count to 0
let count = 0;

// BAD: Explains obvious code
// Loop through users
for (const user of users) { ... }
```

## Checklist

- [ ] README has quick start, installation, usage, and API sections
- [ ] Code examples are tested and work
- [ ] Environment variables documented
- [ ] Public API functions have JSDoc/docstrings
- [ ] Complex logic has explanatory comments (why, not what)
- [ ] Setup instructions are complete (a new developer can follow them)
- [ ] Breaking changes have migration guides
- [ ] No stale/outdated documentation
