FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./
COPY server/package.json server/package.json
COPY contract/package.json contract/package.json
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_USE_MOCK
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_USE_MOCK=${VITE_USE_MOCK}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

RUN bun run build
RUN bun install --production --frozen-lockfile

FROM oven/bun:1 AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/bun.lock ./bun.lock
COPY --from=build --chown=bun:bun /app/server/package.json ./server/package.json
COPY --from=build --chown=bun:bun /app/server/src ./server/src
COPY --from=build --chown=bun:bun /app/contract/package.json ./contract/package.json
COPY --from=build --chown=bun:bun /app/contract/src ./contract/src
COPY --from=build --chown=bun:bun /app/v2_sql ./v2_sql
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules

USER bun

EXPOSE 8787

CMD ["bun", "server/src/index.ts"]
