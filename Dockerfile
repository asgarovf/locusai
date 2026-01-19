FROM oven/bun:1 as base

WORKDIR /app

# Copy root configurations
COPY package.json bun.lock tsconfig.base.json biome.json ./

# Copy packages
COPY packages/shared ./packages/shared

# Copy the server app
COPY apps/server ./apps/server

# Install dependencies (frozen lockfile for speed/consistency)
RUN bun install --frozen-lockfile

# Set production environment
ENV NODE_ENV=production
ENV DB_MODE=cloud
ENV PORT=8080

# Expose the API port
EXPOSE 8080

# Run the server
WORKDIR /app/apps/server
CMD ["bun", "run", "src/index.ts"]
