FROM oven/bun:1 as base

WORKDIR /app

# Copy root configurations
COPY package.json bun.lock tsconfig.base.json biome.json ./

# Copy packages
COPY packages/shared ./packages/shared

# Copy the API app
COPY apps/api ./apps/api

# Install dependencies (frozen lockfile for speed/consistency)
RUN bun install --frozen-lockfile

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose the API port
EXPOSE 8080

# Run the API
WORKDIR /app/apps/api
CMD ["bun", "run", "start:prod"]
