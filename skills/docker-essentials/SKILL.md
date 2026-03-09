---
name: docker-essentials
description: Create and optimize Dockerfiles, docker-compose configurations, and container workflows. Use when containerizing applications, setting up development environments, or optimizing Docker builds.
allowed-tools: [Read, Grep, Glob, Bash, Write, Edit]
tags: [docker, containers, dockerfile, docker-compose, devops, deployment, containerization]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Docker Essentials

## When to use this skill
- Writing or optimizing a Dockerfile
- Creating docker-compose configurations
- Containerizing an application
- Setting up multi-container development environments
- Debugging container issues
- Optimizing Docker image size and build times

## Dockerfile best practices

### Multi-stage builds

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Layer optimization

```dockerfile
# GOOD: Copy dependency files first for cache
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# BAD: Busts cache on any source change
COPY . .
RUN npm install
```

### Security

- Use specific image tags, not `latest`
- Run as non-root user
- Use `.dockerignore` to exclude secrets, node_modules, .git
- Don't store secrets in ENV — use build secrets or runtime mounts
- Scan images: `docker scout cves <image>`

### .dockerignore

```
node_modules
.git
.env*
dist
*.log
.DS_Store
coverage
.nyc_output
```

## Docker Compose

### Development setup

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### Common patterns

**Hot reload in development:**
```yaml
volumes:
  - .:/app           # Mount source
  - /app/node_modules # Preserve container node_modules
```

**Health checks:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

## Common commands reference

```bash
# Build and run
docker compose up -d --build
docker compose down -v          # Remove volumes too
docker compose logs -f app      # Follow logs

# Debug
docker compose exec app sh      # Shell into container
docker compose ps               # Container status

# Image management
docker build -t myapp:latest .
docker images --filter "dangling=true"  # Orphaned images
docker system prune -af                  # Clean everything
```

## Language-specific Dockerfiles

### Python
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0"]
```

### Go
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM alpine:3.19
COPY --from=builder /app/server /server
CMD ["/server"]
```

## Checklist

- [ ] Multi-stage build to minimize image size
- [ ] Dependency files copied before source (layer caching)
- [ ] Non-root user configured
- [ ] `.dockerignore` in place
- [ ] No secrets in Dockerfile or ENV
- [ ] Health checks configured
- [ ] Specific image tags used
- [ ] Volumes for persistent data
- [ ] Port mappings documented
