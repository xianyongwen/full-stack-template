# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

### Backend (server/)
```bash
# Install
pnpm install

# Dev (tsx watch hot-reload)
pnpm dev

# Build (tsc + tsc-alias + post-build script)
pnpm build

# Run compiled
pnpm start

# Prisma
pnpm prisma:generate    # Generate Prisma Client
pnpm prisma:migrate     # Run dev migration
pnpm prisma:reset       # Reset DB

# ⚠️ 不要使用 `npx prisma db push` — 本项目使用 Prisma Driver Adapters
# (`@prisma/adapter-pg`)，`db push` 不兼容。必须用 `pnpm prisma:migrate` 来更新数据库。

# Test (Node test runner with tsx)
pnpm test
# Run a single test:
node --import tsx --test src/path/to/test.file.test.ts

# Path alias: @/ → src/
```

### Frontend (manage-ui-react/)
```bash
pnpm install
pnpm dev        # Vite dev server
pnpm build      # tsc -b && vite build
pnpm lint       # oxlint
pnpm format     # prettier
```

### Infrastructure (project root)
```bash
docker compose up -d              # Start PostgreSQL, Redis, MinIO
docker compose down -v            # Stop + delete volumes
docker compose -f docker-compose-prod.yml up -d  # Full production stack
```

## Project Structure

```
full-stack-template/
├── server/                        # Backend: Fastify + Prisma + PostgreSQL
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── app.ts                 # Fastify app builder (routes, plugins, hooks)
│   │   ├── config.ts              # Env config (JWT_SECRET, MINIO_, REDIS_, etc.)
│   │   ├── seed.ts                # Super admin + seed permissions
│   │   ├── worker.ts              # Standalone worker entry
│   │   ├── cron.ts                # Cron job registration
│   │   ├── app.test.ts            # Smoke test
│   │   ├── common/
│   │   │   ├── constants/system.ts    # ROLE_CODES, PERM_TYPE, etc.
│   │   │   ├── errors/index.ts        # BusinessError, UnauthorizedError
│   │   │   ├── types/page.ts          # Pagination types
│   │   │   └── utils/                 # password.ts (bcrypt), tree.ts (buildTree)
│   │   ├── lib/
│   │   │   ├── redis.ts               # ioredis singleton
│   │   │   ├── oss.ts                 # MinIO/S3 client (presigned URLs, upload, stream)
│   │   │   ├── user-cache.ts          # Redis-backed user cache
│   │   │   ├── logger.ts              # Pino logger with rolling
│   │   │   ├── id.ts                  # nanoid
│   │   │   └── wechat.ts              # WeChat SDK wrapper
│   │   ├── modules/
│   │   │   ├── auth/                  # Login, userinfo, logout
│   │   │   ├── file/                  # File upload/download (MinIO)
│   │   │   └── system/               # RBAC admin (user, role, permission, dept, dict)
│   │   │       ├── user/
│   │   │       ├── role/
│   │   │       ├── permission/
│   │   │       ├── dept/
│   │   │       └── dict/
│   │   ├── plugins/
│   │   │   └── auth.plugin.ts         # JWT verify + RBAC permission check
│   │   ├── prisma/
│   │   │   ├── client.ts              # PrismaClient singleton (with adapter-pg)
│   │   │   └── transaction-context.ts  # AsyncLocalStorage for implicit transactions
│   │   └── types/                     # fastify.d.ts, fastify-instance.d.ts
│   ├── prisma/
│   │   └── schema.prisma              # 6 models: File, SysDept, SysUser, SysRole, SysPermission, SysDictType/Data
│   ├── scripts/
│   │   └── build-post.mjs             # Generates dist/package.json for deployment
│   └── tsconfig.json                  # ESNext modules, bundler resolution, @/ → src/
│
├── manage-ui-react/                 # Frontend: React 19 + Vite + Ant Design + TailwindCSS
│   ├── src/
│   │   ├── main.tsx                  # Entry point
│   │   ├── lib/
│   │   │   ├── request.ts            # Axios instance (token injection, 401 redirect, ApiResult unwrap)
│   │   │   ├── menu.tsx              # Menu tree → antd Menu items
│   │   │   └── icons.tsx             # Icon mapping
│   │   ├── stores/
│   │   │   └── auth.ts               # Zustand auth store (token, userInfo, logout)
│   │   ├── api/
│   │   │   ├── auth.ts               # Login, userinfo, logout API calls
│   │   │   └── system.ts             # CRUD APIs for user/role/menu/dept/dict
│   │   ├── router/
│   │   │   ├── routes.tsx            # React Router data-mode routes with adminLoader guard
│   │   │   └── index.tsx             # createBrowserRouter
│   │   ├── layouts/
│   │   │   ├── AdminLayout.tsx        # Sidebar menu + header + outlet
│   │   │   └── RootLayout.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── system/
│   │   │       ├── user/             # UserManage, UserEditModal, UserAssignRoleModal, UserResetPwdModal
│   │   │       ├── role/             # RoleManage, RoleEditModal, RolePermModal
│   │   │       ├── menu/             # MenuManage, MenuEditModal
│   │   │       ├── dept/             # DeptManage, DeptEditModal
│   │   │       └── dict/             # DictTypeManage, DictTypeEditModal, DictDataModal
│   │   ├── components/
│   │   │   ├── AuthButton.tsx         # Permission-gated button
│   │   │   └── FormModal.tsx          # Reusable form modal
│   │   ├── hooks/
│   │   │   └── useTable.ts           # Paginated table hook
│   │   ├── types/
│   │   │   ├── common.ts
│   │   │   └── system.ts
│   │   └── styles/                    # SCSS + TailwindCSS
│   └── vite.config.ts                # Proxy /api → localhost:8890
│
├── docker-compose.yml               # Dev: PostgreSQL 16, Redis 7, MinIO
├── docker-compose-prod.yml          # Prod: + backend + nginx frontend
└── specs/                           # PRD / feature documents
```

## Architecture

### Backend Layering
Each module follows: **Route → Controller → Service → Repository**

- **Route**: Registers endpoints with Fastify, attaches schema (Zod) and `config.permission` for RBAC
- **Controller**: Handles request/response (extracts params, calls service, sends reply)
- **Service**: Business logic, orchestrates repositories, manages transactions
- **Repository**: Pure Prisma queries, no business logic

All modules under `system/` share a global `preHandler: app.authenticate` (JWT + RBAC).

### Implicit Transaction via AsyncLocalStorage
`prisma/transaction-context.ts` provides `runInTransaction()` and `getClient()`. Services wrap multi-repo operations in `runInTransaction()` — repositories call `getClient()` and automatically participate without a `tx` parameter.

### Authentication Flow
1. `POST /auth/login` → verify password → sign JWT → return token
2. Client stores token in `localStorage` as `manage_token`
3. Requests carry `Authorization: Bearer <token>`
4. `auth.plugin.ts` verifies JWT → loads user (with Redis cache) → checks `config.permission` against user's permission codes
5. Super admin (role code `super_admin`) bypasses all permission checks

### Permission Model
- Resources: **menu + permission** tree (`SysPermission`), types: directory/menu/button/API
- `permCode` strings like `system:user:list`, `system:user:add`
- Routes declare required permission via `config.permission` array
- Frontend `AuthButton` checks user permissions for button-level visibility

### API Convention
- Unified response envelope: `{ code: 'ok' | string, message: string, data: T | null }`
- Business errors use `BusinessError(code, message, httpStatus?)` → caught by error handler
- All business routes under `/api` prefix
- Swagger docs at `/apiDoc` (non-production only)

### Key Patterns

- **Soft delete**: System tables use `deleted` field (0=active, 1=deleted), repositories filter with `where: { deleted: 0 }`
- **Error hierarchy**: `BusinessError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`, `ConflictError`
- **Frontend reusable components**: `AuthButton` (permission-gated), `FormModal` (CRUD modal), `useTable` (paginated table state)
- **Frontend conventions**: Prettier (no semicolons, single quotes, trailing commas es5), Oxlint for linting

### Known Inconsistencies

- `server/Dockerfile` references `package-lock.json` + `npm ci`, but the repo uses pnpm
- `docker-compose-prod.yml` references `./manage-ui/` paths, but the frontend directory is `manage-ui-react`

### Deployment

Build script (`scripts/build-post.mjs`) produces `dist/` with production-only dependencies, prisma schema, and deployment instructions.
