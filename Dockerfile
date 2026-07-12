# syntax=docker/dockerfile:1.4
FROM node:20-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
# Copy workspace config + lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/

# Install dependencies for api workspace only
RUN pnpm install --filter api --frozen-lockfile

# Copy the api source code
COPY api/ ./api/
COPY tsconfig.base.json ./

# Build the api
RUN pnpm --filter api build

# Deploy the api workspace to a standalone directory with only prod dependencies
RUN pnpm deploy --filter api --prod /app/deployed
RUN cp -r api/dist /app/deployed/dist

# --- Production stage ---
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy the isolated workspace from the deploy step
COPY --from=builder /app/deployed ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
