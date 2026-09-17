# full stack template

A full-stack admin management system template with authentication, RBAC permissions and system management out of the box — swap in any business domain on top.

**Language**: English | [简体中文](./README.zh.md)

## What's Included

- **Backend** [`server/`](./server): Node.js + TypeScript + Fastify + Prisma (PostgreSQL)
- **Frontend** [`manage-ui-react/`](./manage-ui-react): React 19 + Vite + Ant Design + TailwindCSS
- **Infrastructure** [`docker-compose.yml`](./docker-compose.yml): PostgreSQL, Redis, MinIO

## Features

- **Auth**: JWT login, Redis-cached user lookup, auto-redirect on 401
- **RBAC**: four-level permission tree (directory / menu / button / API); route-level guard plus button-level visibility via `AuthButton`; super-admin role bypasses all checks
- **System management**: full CRUD for user, role, menu, dept (tree) and dict
- **File upload**: MinIO presigned direct upload / server-side proxy upload / presigned download (Redis cached)
- **Dashboard**: multi-panel demo homepage (relation graph / AI analysis / opportunity pipeline / interaction timeline), powered by **frontend mocks** (see `manage-ui-react/src/pages/Dashboard/mock/`) — a ready-made layout reference you can adapt for real business panels
- **Developer experience**: implicit transactions (AsyncLocalStorage, repositories join transparently), Swagger docs at `/apiDoc` (non-production), unified response envelope and business error hierarchy

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) (`npm i -g pnpm`)
- [Docker](https://www.docker.com/) + Docker Compose (for the database and other infrastructure)

---

## Local Development

### 1. Start infrastructure (PostgreSQL / Redis / MinIO)

From the repository root:

```bash
docker compose up -d
```

Service ports once running:

| Service    | Port                                                        | Notes                                   |
| ---------- | ----------------------------------------------------------- | --------------------------------------- |
| PostgreSQL | `localhost:5432`                                            | Database `xywtest_db`                   |
| Redis      | `localhost:6379`                                            | Password `xyw334455`                    |
| MinIO      | `localhost:9000` (API) / `localhost:9001` (console)          | Credentials all `minioadmin`            |

> To stop: `docker compose down` (add `-v` to also remove data volumes).

---

### 2. Start the backend

```bash
cd server

# (1) Install dependencies
pnpm install

# (2) Make sure .env exists (create it on first run, see below)
#     DATABASE_URL=postgresql://xywtest:xyw_!*!_242523@localhost:5432/xywtest_db?schema=public
#     ...see server/.env for the rest

# (3) Generate the Prisma Client and run migrations
pnpm prisma:generate
pnpm prisma:migrate

# (4) Start the dev server (hot reload)
pnpm dev
```

The backend runs at **http://localhost:8890**.

Common scripts:

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `pnpm dev`             | Dev mode (tsx watch hot reload)          |
| `pnpm build`           | Compile to `dist/`                       |
| `pnpm start`           | Run the compiled output                  |
| `pnpm prisma:generate` | Generate the Prisma Client               |
| `pnpm prisma:migrate`  | Run dev migrations                       |
| `pnpm prisma:reset`    | Reset the database (use with care)       |

Required environment variables live in [`server/.env`](./server/.env); at minimum:

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

> ⚠️ This project uses Prisma Driver Adapters (`@prisma/adapter-pg`); do NOT use `npx prisma db push`. Always change the schema via `pnpm prisma:migrate`.

---

### 3. Start the frontend

```bash
cd manage-ui-react

# (1) Install dependencies
pnpm install

# (2) Make sure .env.development exists (defaults are fine)
#     VITE_API_BASE_URL=/api
#     VITE_PORT=8090

# (3) Start the dev server (hot reload)
pnpm dev
```

The frontend runs at **http://localhost:8090**.

In development, requests to `/api` are proxied by Vite to the backend at `http://localhost:8890` (see [`vite.config.ts`](./manage-ui-react/vite.config.ts)), so both must be running.

Common scripts:

| Command         | Description                       |
| --------------- | --------------------------------- |
| `pnpm dev`      | Start the dev server              |
| `pnpm build`    | Build production output to `dist/`|
| `pnpm preview`  | Preview the production build      |
| `pnpm lint`     | Lint (oxlint)                     |
| `pnpm format`   | Format (prettier)                 |

---

## Default Account

A super admin is created automatically on first backend start:

- Username: `admin`
- Password: `admin123`
- Source: created by `ensureSuperAdmin` at startup; override via the `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` environment variables

---

## Startup Summary

1. From the root: `docker compose up -d`
2. In `server/`: `pnpm install` → `pnpm prisma:generate` → `pnpm prisma:migrate` → `pnpm dev`
3. In `manage-ui-react/`: `pnpm install` → `pnpm dev`
4. Open `http://localhost:8090` and sign in with the default account

---

## Production Deployment (Docker)

Production uses [`docker-compose-prod.yml`](./docker-compose-prod.yml), which orchestrates infrastructure, backend and frontend (nginx) together.

```bash
# 1. Build both apps first
cd server && pnpm install && pnpm build
cd ../manage-ui-react && pnpm install && pnpm build

# 2. Start everything from the repo root
docker compose -f docker-compose-prod.yml up -d
```

After deployment:

- Frontend: `http://localhost:8090`
- Backend: `http://localhost:8890`

Override the super admin account via environment variables:

```bash
SUPER_ADMIN_USERNAME=admin SUPER_ADMIN_PASSWORD=admin123 \
docker compose -f docker-compose-prod.yml up -d
```

---

## More Docs

| Doc                                           | Description                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| [`server/README.md`](./server/README.md)       | Backend architecture and dev standards (layering, transactions, permissions)   |
| [`manage-ui-react/README.md`](./manage-ui-react/README.md) | Frontend stack, design conventions and dev guide                    |
| [`CLAUDE.md`](./CLAUDE.md)                     | Working guide for Claude Code / AI assistants                                  |
