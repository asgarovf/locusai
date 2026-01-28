export interface SkillTemplate {
  name: string;
  content: string;
}

export const DEFAULT_SKILLS: SkillTemplate[] = [
  {
    name: "locus-expert",
    content: `---
name: locus-expert
description: Expertise in Locus-specific configuration, commands, and workflows.
---
# Locus Expert Skill

Use this skill to help manage Locus in this project.

## Locus Commands
- \`locus init\`: Initialize Locus.
- \`locus index\`: Index the codebase for AI context.
- \`locus run\`: Start an agent to work on tasks.

## Configuration
- \`.locus/config.json\`: Main project configuration.
- \`CLAUDE.md\`: AI context and preferences.
`,
  },
  {
    name: "project-navigator",
    content: `---
name: project-navigator
description: General guidelines for efficient codebase exploration and navigation.
---
# Project Navigator Skill

Use this skill to explore and understand the codebase efficiently.

## Navigation Tips
- Start by exploring the root directory to understand the project structure.
- Look for \`README.md\` and documentation files.
- Identify the main entry points of the application.
- Use \`grep\` or search tools to find relevant code sections.
`,
  },
  {
    name: "frontend-expert",
    content: `---
name: frontend-expert
description: Specialized instructions for modern frontend development (React, Next.js, CSS).
---
# Frontend Expert Skill

Guidance for building premium, high-performance web interfaces.

## Core Best Practices
- Use semantic HTML and accessible ARIA attributes.
- Prioritize responsive design and mobile-first approach.
- Use Vanilla CSS or TailwindCSS as per project guidelines.
- Focus on micro-animations and smooth transitions.

## Testing
- Use Playwright or Cypress for E2E tests.
- Use React Testing Library for component testing.
`,
  },
  {
    name: "backend-expert",
    content: `---
name: backend-expert
description: Expertise in API design, database modeling, and server-side logic.
---
# Backend Expert Skill

Guidance for building scalable, secure, and robust backend systems.

## API Standards
- Follow RESTful principles or GraphQL best practices.
- Use clear versioning and consistent error handling.
- Document APIs with Swagger/OpenAPI.

## Database
- Design efficient schemas and indexes.
- Use migrations for all schema changes.
- Handle transactions and concurrency correctly.
`,
  },
  {
    name: "testing-champion",
    content: `---
name: testing-champion
description: Driving project quality through comprehensive testing strategies.
---
# Testing Champion Skill

Guidelines for ensuring project reliability and preventing regressions.

## Test Pyramid
- **Unit Tests**: Test individual functions and logic in isolation.
- **Integration Tests**: Test interactions between different modules.
- **E2E Tests**: Test critical user flows from end to end.

## Requirements
- Maintain high test coverage for critical paths.
- Write descriptive test cases.
- Run tests in CI before merging.
`,
  },
  {
    name: "devops-wizard",
    content: `---
name: devops-wizard
description: Expertise in CI/CD, deployment, and infrastructure management.
---
# DevOps Wizard Skill

Guidance for maintaining high availability and smooth delivery pipelines.

## CI/CD
- Automate builds, tests, and deployments via GitHub Actions/GitLab CI.
- Use staging environments for verification before production.

## Infrastructure
- Use Infrastructure as Code (Terraform, Pulumi).
- Monitor system health and performance (Prometheus, Grafana).
- Handle secrets securely via vault/secrets manager.
`,
  },
  {
    name: "security-sentinel",
    content: `---
name: security-sentinel
description: Specialized knowledge in web security, vulnerability assessment, and safe coding.
---
# Security Sentinel Skill

Guidance for protecting the application and user data.

## Safe Practices
- Sanitize all user inputs to prevent XSS and SQL injection.
- Implement proper Authentication and Authorization (RBAC).
- Use HTTPS and security headers.
- Regularly audit dependencies for vulnerabilities.
`,
  },
  {
    name: "performance-master",
    content: `---
name: performance-master
description: Deep focus on optimization, profiling, and efficient resource usage.
---
# Performance Master Skill

Tactics for ensuring the application is fast and responsive.

## Optimization Areas
- **Frontend**: Reduce bundle size, optimize images, use lazy loading.
- **Backend**: Implement caching strategies, optimize queries, profile CPU/Memory usage.
- **Network**: Reduce latency and minimize round trips.
`,
  },
  {
    name: "docs-wordsmith",
    content: `---
name: docs-wordsmith
description: Expertise in technical writing and maintaining clear project documentation.
---
# Docs Wordsmith Skill

Guidelines for keeping documentation clear, concise, and up to date.

## Principles
- Always update documentation when changing core logic.
- Use clear headings and consistent terminology.
- Provide examples for complex features.
- Keep README.md helpful for new contributors.
`,
  },
  {
    name: "nextjs-optimizer",
    content: `---
name: nextjs-optimizer
description: Specialized guidance for Next.js performance and architecture.
---
# Next.js Optimizer Skill

Expert instructions for high-performance Next.js applications.

## Performance
- Use Server Components by default.
- Optimize images with next/image.
- Implement Partial Prerendering (PPR) where applicable.
- Monitor Core Web Vitals.

## Architecture
- Use App Router patterns.
- Implement server actions for mutations.
- Manage cache keys and revalidation carefully.
`,
  },
  {
    name: "zustand-specialist",
    content: `---
name: zustand-specialist
description: State management patterns and best practices using Zustand.
---
# Zustand Specialist Skill

Guidance for efficient state management with Zustand.

## Patterns
- Slice pattern for organizing large stores.
- Use selectors for atomic updates.
- Keep stores focused and decoupled.
- Handle persistence and hydration correctly.
`,
  },
  {
    name: "drizzle-guide",
    content: `---
name: drizzle-guide
description: Database schema design and query optimization with Drizzle ORM.
---
# Drizzle Guide Skill

Best practices for Drizzle ORM and database management.

## Schema Design
- Define clear types and relationships.
- Use migrations for all changes.
- Implement indexes for frequently queried columns.

## Querying
- Optimize for performance (batching, joins).
- Use transaction API for atomic operations.
- Ensure type safety across the application.
`,
  },
  {
    name: "playwright-automation",
    content: `---
name: playwright-automation
description: Automation and E2E testing best practices using Playwright.
---
# Playwright Automation Skill

Guidance for building reliable browser-based tests.

## Best Practices
- Use locators instead of selectors.
- Implement page object models for cleaner tests.
- Run tests in parallel to save time.
- Capture trace files and videos for debugging.
`,
  },
  {
    name: "i18n-coordinator",
    content: `---
name: i18n-coordinator
description: Managing internationalization and localization workflows.
---
# i18n Coordinator Skill

Guidance for globalizing your application.

## Workflow
- Use a central translation service (e.g., react-i18next).
- Never hardcode user-facing strings.
- Support RTL (Right-to-Left) layouts if needed.
- Ensure dynamic content is properly translated.
`,
  },
  {
    name: "project-overview",
    content: `---
name: project-overview
description: High-level architectural map and project organization guidance.
---
# Project Overview Skill

Guidance for understanding and maintaining the overall project architecture.

## Structure
- Maintain a clear dependency graph.
- Document the responsibility of each folder/package.
- Keep boundaries between components clean.
- Ensure the codebase follows established patterns consistently.
`,
  },
];
