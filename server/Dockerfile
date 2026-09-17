# ─────────────────────────────────────────────
# 后端服务：Fastify + Prisma + TypeScript
# 多阶段构建：builder 编译 TS，runner 只保留 dist + 生产依赖
# ─────────────────────────────────────────────

# ── Stage 1: builder ──
FROM node:22-alpine AS builder

WORKDIR /app

# 安装 pnpm（与 lockfile 版本对应）以及 Prisma 所需的构建依赖
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache openssl libc6-compat

# 先复制依赖清单，最大化利用 Docker 层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码、Prisma schema 与构建脚本
COPY tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src

# 生成 Prisma Client，再编译 TS（build 脚本会执行 tsc + scripts/build-post.mjs）
RUN npx prisma generate
RUN npm run build

# 生成的 dist/package.json 仅包含生产依赖，用 npm ci 安装
RUN cd dist && npm ci --omit=dev && npx prisma generate


# ── Stage 2: runner ──
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat

# 从 builder 复制编译产物（含 dist/package.json、dist/prisma、node_modules）
COPY --from=builder /app/dist ./dist

WORKDIR /app/dist

# 容器内固定监听端口，host 由 compose 统一映射
ENV HOST=0.0.0.0
ENV PORT=8890
EXPOSE 8890

# 启动：先生成 Prisma Client，执行迁移，再启动应用
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]