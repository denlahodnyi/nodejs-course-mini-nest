FROM node:24-slim AS base
RUN npm i -g pnpm@11

FROM base AS development
WORKDIR /app
COPY package.json pnpm-*.yaml ./
RUN pnpm i --frozen-lockfile
COPY . .
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["pnpm", "dev"]

FROM development AS tests
CMD ["pnpm", "test"]

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-*.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
COPY package.json pnpm-*.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --prod --frozen-lockfile
COPY --from=builder /app/dist/ ./dist/
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
