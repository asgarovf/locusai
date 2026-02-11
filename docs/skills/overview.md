---
description: Enhance your AI agents with custom skills.
---

# Skills

## What Are Skills?

Skills are instruction files that give AI agents specialized knowledge about your project, tools, or workflows. They are read by agents as part of their context, helping them understand conventions, patterns, and best practices specific to your codebase.

---

## How Skills Work

Skills are simple markdown files placed in specific directories that AI agents scan. Each skill contains instructions, examples, and guidelines that the agent follows when executing tasks.

For example, a "backend expert" skill might include:

* Your API conventions (REST patterns, error handling)
* Database query patterns
* Authentication middleware usage
* Testing patterns specific to your backend

---

## Setting Up Skills

Skills are configured **per AI provider**. Each provider looks for skills in its own directory:

{% tabs %}
{% tab title="Claude" %}
Claude reads skills from the `.claude/skills/` directory.

```
your-project/
└── .claude/
    └── skills/
        └── my-skill/
            └── SKILL.md
```

For setup instructions, see the [Claude documentation on project-level instructions](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).
{% endtab %}

{% tab title="Codex" %}
Codex reads skills from the `.codex/skills/` directory.

```
your-project/
└── .codex/
    └── skills/
        └── my-skill/
            └── SKILL.md
```

For setup instructions, see the [Codex documentation](https://github.com/openai/codex).
{% endtab %}
{% endtabs %}

---

## Writing a Skill

A skill is a markdown file (typically `SKILL.md`) that contains instructions for the agent. Keep these guidelines in mind:

* **Be specific** — Include concrete examples from your codebase
* **Be concise** — Agents have context limits; focus on what matters most
* **Be actionable** — Write instructions the agent can follow, not general advice
* **Use examples** — Show code patterns the agent should follow

<details>

<summary>Example skill file</summary>

```markdown
# API Development

## Conventions
- All endpoints follow RESTful patterns
- Use Zod for request validation
- Return consistent error responses with status codes
- Wrap all handlers in try/catch with proper error forwarding

## File Structure
- Routes: `src/routes/<resource>.ts`
- Controllers: `src/controllers/<resource>.controller.ts`
- Services: `src/services/<resource>.service.ts`

## Error Response Format
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable message"
  }
}
```

</details>

{% hint style="info" %}
Skills are entirely optional. Agents work without them using the context from `.locus/LOCUS.md`, workspace documents, and the codebase index. Skills are an additional layer of specialization.
{% endhint %}

---

## Multiple Agent Directories

If you use multiple AI providers, you can maintain skills in multiple directories:

```
your-project/
├── .claude/skills/    # Claude-specific skills
├── .codex/skills/     # Codex-specific skills
├── .cursor/skills/    # Cursor-specific skills
└── .gemini/skills/    # Gemini-specific skills
```

Each provider will only read skills from its own directory.
