# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN apk add --no-cache libc6-compat \
  && npm install --global pnpm@11.9.0
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod \
  && rm -rf /pnpm/store

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1024
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm build \
  && mkdir -p .ops \
  && cp deploy/render-start.mjs .ops/render-start.mjs \
  && pnpm exec esbuild src/db/migrate.ts --bundle --platform=node --format=esm --target=node24 --external:pg-native --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" --outfile=.ops/migrate.mjs \
  && pnpm exec esbuild src/scripts/seed.ts --bundle --platform=node --format=esm --target=node24 --external:pg-native --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" --outfile=.ops/seed.mjs \
  && pnpm exec esbuild src/scripts/create-super-admin.ts --bundle --platform=node --format=esm --target=node24 --external:pg-native --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" --outfile=.ops/create-super-admin.mjs \
  && pnpm exec esbuild src/workers/media-worker.ts --bundle --platform=node --format=esm --target=node24 --external:pg-native --external:sharp --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" --outfile=.ops/media-worker.mjs \
  && rm -rf .next/cache

FROM node:24-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 MEDIA_ROOT=/data/media
RUN apk add --no-cache libc6-compat ffmpeg \
  && addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs \
  && mkdir -p /data/media && chown -R nextjs:nodejs /data/media
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.ops ./.ops
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrations ./src/db/migrations
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
