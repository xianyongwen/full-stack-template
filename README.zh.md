# full stack template

全栈后台管理系统模板，开箱即用地提供登录鉴权、RBAC 权限和系统管理，业务层可直接替换为任意领域。

**语言**：简体中文 ｜ [English](./README.md)

## 项目组成

- **后端** [`server/`](./server)：Node.js + TypeScript + Fastify + Prisma（PostgreSQL）
- **前端** [`manage-ui-react/`](./manage-ui-react)：React 19 + Vite + Ant Design + TailwindCSS
- **基础设施** [`docker-compose.yml`](./docker-compose.yml)：PostgreSQL、Redis、MinIO

## 功能特性

- **认证**：JWT 登录，Redis 缓存用户信息，401 自动跳转登录页
- **RBAC 权限**：目录 / 菜单 / 按钮 / API 四级权限树；路由级守卫 + 前端按钮级显隐（`AuthButton`）；超级管理员角色放行全部权限
- **系统管理**：用户、角色、菜单、部门（树形）、字典 五大模块完整 CRUD
- **文件上传**：MinIO 预签名直传 / 服务端代理上传 / 预签名下载（Redis 缓存）
- **Dashboard**：多面板演示首页（关系图谱 / AI 分析 / 商机推进 / 互动时间轴），数据为**前端 mock**（见 `manage-ui-react/src/pages/Dashboard/mock/`），可作为业务面板的布局参考直接改造
- **开发体验**：隐式事务（AsyncLocalStorage，Repository 无感参与）、Swagger 文档（非生产环境访问 `/apiDoc`）、统一响应封套与业务错误体系

---

## 环境要求

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/)（`npm i -g pnpm`）
- [Docker](https://www.docker.com/) + Docker Compose（用于运行数据库等基础设施）

---

## 本地开发启动步骤

### 1. 启动基础设施（PostgreSQL / Redis / MinIO）

在项目根目录执行：

```bash
docker compose up -d
```

启动后各服务端口：

| 服务       | 端口            | 说明                          |
| ---------- | --------------- | ----------------------------- |
| PostgreSQL | `localhost:5432` | 数据库，库名 `xywtest_db`     |
| Redis      | `localhost:6379` | 密码 `xyw334455`              |
| MinIO      | `localhost:9000`（API）/ `localhost:9001`（控制台） | 账号/密码均为 `minioadmin` |

> 关闭基础设施：`docker compose down`（加 `-v` 会同时删除数据卷）。

---

### 2. 启动后端

```bash
cd server

# (1) 安装依赖
pnpm install

# (2) 确认 .env 已配置（参考下方说明，首次需要新建）
#     DATABASE_URL=postgresql://xywtest:xyw_!*!_242523@localhost:5432/xywtest_db?schema=public
#     ...其它见 server/.env

# (3) 生成 Prisma Client 并执行数据库迁移
pnpm prisma:generate
pnpm prisma:migrate

# (4) 启动开发服务（热更新）
pnpm dev
```

后端默认运行在 **http://localhost:8890**。

常用脚本：

| 命令                   | 说明                       |
| ---------------------- | -------------------------- |
| `pnpm dev`             | 开发模式（tsx watch 热更新）|
| `pnpm build`           | 编译到 `dist/`             |
| `pnpm start`           | 运行编译后的产物           |
| `pnpm prisma:generate` | 生成 Prisma Client         |
| `pnpm prisma:migrate`  | 执行数据库迁移（开发）     |
| `pnpm prisma:reset`    | 重置数据库（谨慎使用）     |

后端需要的环境变量见 [`server/.env`](./server/.env)，至少包含：

```env
DATABASE_URL="postgresql://xywtest:xyw_!*!_242523@localhost:5432/xywtest_db?schema=public"
JWT_SECRET="..."
REDIS_PASSWORD="xyw334455"
MINIO_ENDPOINT="127.0.0.1"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="files"
```

> ⚠️ 本项目使用 Prisma Driver Adapters（`@prisma/adapter-pg`），不要使用 `npx prisma db push`，一律通过 `pnpm prisma:migrate` 变更表结构。

---

### 3. 启动前端

```bash
cd manage-ui-react

# (1) 安装依赖
pnpm install

# (2) 确认 .env.development 已配置（默认即可）
#     VITE_API_BASE_URL=/api
#     VITE_PORT=8090

# (3) 启动开发服务（热更新）
pnpm dev
```

前端默认运行在 **http://localhost:8090**。

开发环境下，前端发往 `/api` 的请求会经 Vite 代理转发到后端 `http://localhost:8890`（见 [`vite.config.ts`](./manage-ui-react/vite.config.ts)），因此前后端需同时运行。

常用脚本：

| 命令            | 说明                          |
| --------------- | ----------------------------- |
| `pnpm dev`      | 启动开发服务器                |
| `pnpm build`    | 构建生产产物到 `dist/`        |
| `pnpm preview`  | 本地预览构建产物              |
| `pnpm lint`     | 代码检查（oxlint）            |
| `pnpm format`   | 格式化代码（prettier）        |

---

## 登录账号

首次启动后端时自动创建超级管理员，默认账号：

- 用户名：`admin`
- 密码：`admin123`
- 账号来源：后端启动时 `ensureSuperAdmin` 自动创建，可用环境变量 `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` 覆盖

---

## 完整启动顺序小结

1. 根目录 `docker compose up -d`
2. `server/` 下 `pnpm install` → `pnpm prisma:generate` → `pnpm prisma:migrate` → `pnpm dev`
3. `manage-ui-react/` 下 `pnpm install` → `pnpm dev`
4. 浏览器访问 `http://localhost:8090`，使用默认账号登录

---

## 生产部署（Docker）

生产环境使用 [`docker-compose-prod.yml`](./docker-compose-prod.yml)，会同时编排基础设施、后端和前端（nginx）。

```bash
# 1. 先分别构建前后端产物
cd server && pnpm install && pnpm build
cd ../manage-ui-react && pnpm install && pnpm build

# 2. 在根目录启动全部服务
docker compose -f docker-compose-prod.yml up -d
```

部署后访问：

- 前端：`http://localhost:8090`
- 后端：`http://localhost:8890`

可通过环境变量覆盖超级管理员账号：

```bash
SUPER_ADMIN_USERNAME=admin SUPER_ADMIN_PASSWORD=admin123 \
docker compose -f docker-compose-prod.yml up -d
```

---

## 更多文档

| 文档 | 说明 |
| ---- | ---- |
| [`server/README.md`](./server/README.md) | 后端架构与开发规范（模块分层、事务、权限、错误处理） |
| [`manage-ui-react/README.md`](./manage-ui-react/README.md) | 前端技术栈、设计规范与开发指南 |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code / AI 助手工作指引 |
