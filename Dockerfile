# ============================================
# Stage 1: Base - Install bun and dependencies
# ============================================
FROM node:22-alpine AS base
RUN npm install -g bun@latest

# ============================================
# Stage 2: Install dependencies
# ============================================
FROM base AS deps
WORKDIR /app

# Copy package files for all workspaces
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/jest-config/package.json ./packages/jest-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install all dependencies
RUN bun install --frozen-lockfile

# ============================================
# Stage 3: Build shared packages and apps
# ============================================
FROM base AS builder
WORKDIR /app

# Build args for Prisma generate (dummy value - not used at build time)
# prisma generate only needs the schema, not an actual database connection
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN cd apps/api && bunx prisma generate

# Build shared types package first
RUN bun run build --filter=@repo/types

# Build both apps
RUN bun run build --filter=@repo/api --filter=@repo/web

# ============================================
# Stage 4: Production API
# ============================================
FROM base AS api-production
WORKDIR /app

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy built types package (needed at runtime)
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/

EXPOSE 3000

WORKDIR /app/apps/api

CMD ["bun", "run", "start:prod"]

# ============================================
# Stage 5: Production Web
# ============================================
FROM base AS web-production
WORKDIR /app

# Copy built Next.js app
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/

# Copy built types package (needed at runtime)
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/

EXPOSE 3001

WORKDIR /app/apps/web

CMD ["bun", "run", "start"]
