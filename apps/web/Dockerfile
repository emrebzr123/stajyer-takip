# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app/apps/web

# Bağımlılıkları yükle (workspace referansı yok)
COPY apps/web/package.json ./package.json
RUN npm install

# Shared types'ı node_modules içine kopyala
COPY packages/shared/src ./node_modules/@intern-tracker/shared/src
RUN echo '{"name":"@intern-tracker/shared","main":"src/index.ts"}' \
    > ./node_modules/@intern-tracker/shared/package.json

# Kaynak kodu kopyala
COPY apps/web/src         ./src
COPY apps/web/tsconfig.json ./tsconfig.json
COPY apps/web/next.config.js ./next.config.js
COPY apps/web/public      ./public

# Next.js build
ENV NEXT_TELEMETRY_DISABLED=1
RUN ./node_modules/.bin/next build

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./.next/static
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
