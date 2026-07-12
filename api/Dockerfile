# syntax=docker/dockerfile:1.4
FROM node:20-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
# Copy the workspace configuration and package.json
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/

# Install dependencies for api
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter api

# Copy the rest of the api source code
COPY api/ ./api/

# Build the api
RUN pnpm --filter api build

FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy only the compiled output and dependencies from the builder
COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/api/package.json ./
# Actually we can just copy node_modules or use pnpm for production install
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/node_modules ./api/node_modules

# Cloud Run sets PORT environment variable, default to 8080
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
