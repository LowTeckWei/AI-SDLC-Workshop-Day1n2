# syntax=docker/dockerfile:1

# better-sqlite3 is a native addon; keep every stage on the same glibc base
# image (Debian slim, not Alpine/musl) so a binary built in one stage is ABI
# compatible when copied into another.
FROM node:20-bookworm-slim AS base

# ---------------------------------------------------------------------------
# deps: install dependencies (build tools included as a node-gyp fallback if
# better-sqlite3 has no prebuilt binary for this platform/Node ABI).
# ---------------------------------------------------------------------------
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder: compile the Next.js production build (standalone output).
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# runner: minimal runtime image — no build tools, no dev dependencies.
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
