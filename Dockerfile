# syntax=docker/dockerfile:1

# Stage 1: Build frontend
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy workspace config and lockfile first for caching
COPY package.json bun.lock ./
COPY frontend/package.json ./frontend/
COPY common/package.json ./common/
COPY backend/package.json ./backend/

RUN bun install --frozen-lockfile

# Copy source files
COPY frontend/ ./frontend/
COPY common/ ./common/
COPY backend/ ./backend/

# Build frontend (vite build directly, skipping tsc -b to avoid test-only type errors)
WORKDIR /app/frontend
RUN bunx vite build

# ---
# Stage 2: Production
FROM oven/bun:1-slim
WORKDIR /app

# Copy workspace config
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/frontend/package.json ./frontend/package.json
COPY --from=builder /app/common/package.json ./common/package.json
COPY --from=builder /app/backend/package.json ./backend/package.json

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy backend source
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/backend/tsconfig.json ./backend/tsconfig.json
COPY --from=builder /app/backend/prisma.config.ts ./backend/prisma.config.ts
COPY --from=builder /app/backend/prisma ./backend/prisma

# Copy common source
COPY --from=builder /app/common/src ./common/src

# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Generate Prisma client (DATABASE_URL required by prisma.config.ts, dummy value is fine)
WORKDIR /app/backend
RUN DATABASE_URL="postgresql://localhost:5432/dummy" bunx prisma generate

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/index.ts"]
