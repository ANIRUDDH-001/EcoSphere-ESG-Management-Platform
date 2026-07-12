FROM node:20-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .

# Install all dependencies (dev included) to build
RUN pnpm install --frozen-lockfile

# Build the API
RUN pnpm --filter api build

# Run directly from the api folder, with the root node_modules available
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "api/dist/index.js"]
