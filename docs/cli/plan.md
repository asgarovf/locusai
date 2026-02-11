---
description: AI-powered sprint planning from the command line.
---

# plan

Run an AI planning meeting to create a sprint with tasks, priorities, and risk assessments.

---

## Create a Plan

```bash
locus plan "<your directive>"
```

**Example:**

```bash
locus plan "implement user authentication with email/password and OAuth"
```

This triggers a multi-phase AI planning meeting:

1. **Tech Lead** — Breaks down the directive into technical requirements
2. **Architect** — Designs the approach and identifies dependencies
3. **Sprint Organizer** — Creates a structured sprint plan with tasks

The output includes:
* Sprint name and description
* Individual tasks with descriptions, priorities, and assignee roles
* Risk assessments
* Estimated scope

---

## Manage Plans

### List all plans

```bash
locus plan --list
```

### View a plan

```bash
locus plan --show <plan-id>
```

### Approve a plan

```bash
locus plan --approve <plan-id>
```

{% hint style="success" %}
Approving a plan creates the sprint and all tasks in your workspace automatically. You can then run `locus run` to start executing.
{% endhint %}

### Reject a plan

```bash
locus plan --reject <plan-id> --feedback "split this into smaller tasks"
```

Rejecting a plan with feedback triggers a new planning iteration that incorporates your feedback.

### Cancel a plan

```bash
locus plan --cancel <plan-id>
```

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--api-key <KEY>` | API key | From config |
| `--api-url <URL>` | API base URL | From config |
| `--workspace <ID>` | Workspace ID | Auto-resolved |
| `--model <MODEL>` | AI model | From config |
| `--provider <PROVIDER>` | AI provider | From config |
| `--dir <PATH>` | Project directory | Current directory |

---

## Plan States

| State | Meaning |
|-------|---------|
| `pending` | Plan created, awaiting review |
| `approved` | Accepted, sprint and tasks created |
| `rejected` | Rejected with feedback |
| `cancelled` | Cancelled by user |
