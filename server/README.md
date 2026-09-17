# Overview

The backend uses **Fastify + Prisma + Zod + ai-sdk** with a **Domain-Driven layering + Repository + Service** approach — the mainstream pattern in today's Node.js community.

**Language**: English | [简体中文](./README.zh.md)

---

## Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (tsx watch hot reload, alias-loader for path aliases) |
| `npm run build` | Production build (TypeScript compile + path alias replacement + post-build) |
| `npm start` | Start the production server (runs the compiled `dist/index.js`) |
| `npm run prisma:generate` | Generate the Prisma Client (type-safe DB client from `schema.prisma`) |
| `npm run prisma:migrate` | Run database migration (generate and apply migration files locally) |
| `npm run prisma:reset` | Reset the database (drop and re-run all migrations, local only) |
| `npm test` | Run tests (Node.js native test runner + tsx) |

---

## Swagger API Docs

The project integrates `@fastify/swagger` + `@fastify/swagger-ui` and generates OpenAPI 3.0 docs automatically at startup.

- **URL**: `http://127.0.0.1:8890/apiDoc`
- **Auto-generated**: request/response formats inferred from Zod schemas (`jsonSchemaTransform` from `fastify-type-provider-zod`)
- **Auth**: Bearer Token auth is built into the docs — click "Authorize" in the Swagger UI to paste a token and test endpoints directly
- **Environment control**: enabled only in dev/test; in production (`NODE_ENV=production`) the route registration is skipped and `/apiDoc` is not exposed

---

## Overall Architecture

```text
src
├── app.ts
├── index.ts
├── config.ts
├── cron.ts
├── seed.ts
├── worker.ts
│
├── plugins             # Fastify plugins
│   └── auth.plugin.ts
│
├── common
│   ├── errors
│   ├── utils
│   ├── constants
│   └── types
│
├── lib                 # Utility libraries (redis, oss, wechat, logger, etc.)
│
├── modules
│   ├── auth            # Auth (login/register/token)
│   ├── file            # File upload
│   └── system          # User, role, permission menu, dept
│       ├── user
│       ├── role
│       ├── permission
│       └── dept
│
├── prisma
│   ├── client.ts
│   └── transaction-context.ts
│
├── generated
│   └── prisma          # Prisma-generated types
│
├── types               # Type declarations
└── routes
```

The real focus is each module.

For example:

```text
modules
└── order
    ├── order.route.ts
    ├── order.controller.ts
    ├── order.service.ts
    ├── order.repository.ts
    ├── order.schema.ts
    ├── order.types.ts
    ├── order.mapper.ts
    └── index.ts
```

---

## Responsibilities per Layer

### Layer 1: Route

Does exactly one thing:

> Register routes

Example:

```ts
fastify.get(
    "/orders",
    {
        schema: orderListSchema
    },
    controller.list
)
```

No business logic in routes.

---

### Layer 2: Controller

The controller does three things:

- Read the request
- Call the Service
- Return the response

Example:

```ts
export async function list(req, reply) {
    const result = await orderService.list(req.query)

    return result   // Fastify serializes automatically; always use return result
}
```

No SQL in controllers.

No business logic in controllers.

No Prisma access in controllers.

---

### Layer 3: Service (the core)

This is where business logic actually lives.

Example:

```ts
export async function createOrder(dto) {

    const exists = await repository.findByOrderNo(dto.orderNo)

    if (exists) {
        throw new BusinessError("Order number already exists")
    }

    return repository.create(dto)
}
```

It may include:

- Permission checks (business-level, see "Where Permissions Go" below)
- MQ
- Redis
- Files
- Calls to other Services
- Transactions

All business logic goes here.

---

### Layer 4: Repository

Only Prisma lives here.

Repositories are **transaction-unaware**; they get the client through the unified data-access entry point:

```ts
import { getClient } from "@/prisma/transaction-context"

export async function create(data) {
    return getClient().order.create({
        data
    })
}

export async function findById(id) {
    return getClient().order.findUnique({
        where: { id }
    })
}
```

> Note: a repository method signature **never contains a `tx` parameter**. Transactions are opened by the Service and propagated automatically to all repositories through the request-scoped context (AsyncLocalStorage) — see "Where Transactions Go".

No business logic in repositories.

Repositories deal with the database only.

---

### Prisma

Prisma is the ORM.

Repository:

↓

Prisma Client / Transaction (decided by the context)

↓

Database

---

## Schema Changes (schema.prisma)

> **The single source of truth is the Prisma schema directory (`prisma/schema/`). Nobody may alter table structure directly via SQL or a database client.**

### Rules

- **Change the schema, never the database directly.** Whether adding a column, changing a type, adding an index or a table, edit the schema first, then sync to the database through the Prisma migration flow.
- **Every structural change must produce a migration file committed to the repo.** Migration files are the basis for deployment and team sync; never skip them, never just `db push` locally and leave it uncommitted.
- **Once merged into the main branch, a migration file is immutable.** It is an immutable historical record. To change structure, create a new migration — never edit old ones.
- **Environment differences are resolved by migrations only.** Test, staging and production schemas must all result from replaying the same set of migration files; no manual adjustments in any environment.

### Standard Flow

```bash
# 1. Edit the schema (add a column, change a type, add an index …)

# 2. Generate the migration (computes the diff and applies it locally)
pnpm prisma:migrate

# 3. Review the generated SQL: prisma/migrations/<timestamp>_<name>/migration.sql

# 4. Commit the schema and the migrations/ directory

# 5. Others / CI / production replay the migrations
npx prisma migrate deploy
```

### What Each Command Is For (do not mix them up)

| Command | Purpose | Environment |
| --- | --- | --- |
| `prisma migrate dev` | **Generate** a migration after editing the schema and apply it | Local development only |
| `prisma migrate deploy` | **Replay** existing migrations, generates nothing | CI, test, staging, production |
| `prisma db push` | Push the schema straight to the DB, **no migration file** | Prototyping / early experiments only; forbidden in real environments |
| `prisma migrate reset` | Drop the database and re-run all migrations | Local only, wipes data |

### Don'ts

- ❌ Manually running `ALTER TABLE` / `CREATE TABLE` in the database.
- ❌ Using `db push` instead of `migrate dev` (it leaves no migration record; structure gets lost in team collaboration).
- ❌ Editing generated SQL files under `migrations/`.
- ❌ Deleting a migration file to "fix" history — create a new migration instead.
- ❌ Editing the schema and updating only your local database without generating and committing a migration.

---

## Primary Keys: UUID v4

All tables in this project use **UUID v4** as the primary key (`@default(uuid())` in Prisma) instead of traditional auto-increment IDs.

### Why not auto-increment BigInt?

| Scenario | Auto-increment BigInt | UUID v4 |
| --- | --- | --- |
| Exposing user/order IDs | ❌ Enumerable, leaks data volume | ✅ Unguessable |
| Frontend usage | ❌ BigInt serialization issues | ✅ Naturally a string, no serialization pain |
| Sharding / distributed | ❌ Relies on DB auto-increment, collision risk | ✅ Generated client-side, globally unique |
| Data merging | ❌ ID collisions across databases | ✅ Naturally collision-free |

### Practice

```prisma
model SysUser {
  id  String  @id @default(uuid()) @db.Uuid
  // ...
}
```

- `@db.Uuid` maps to the PostgreSQL `uuid` type (16 bytes; more compact than `varchar(36)` with index optimizations).
- Foreign keys also use `String @db.Uuid`.
- Fields like `parentId` that mean "no parent" default to the `NIL_UUID` constant (`00000000-0000-0000-0000-000000000000`).

> **Trade-off**: UUID v4 is fully random and less friendly to B+ tree index writes than auto-increment IDs. If a table reaches hundreds of millions of rows with extreme write throughput, consider **UUID v7** (time-ordered) — it requires the `pg_uuidv7` extension and `@default(dbgenerated("uuid_generate_v7()"))` in the schema. At the current project scale, UUID v4 index performance is more than sufficient.

---

## Where Do Zod Schemas Go?

Recommended:

```text
order.schema.ts
```

Example:

```ts
import { z } from "zod"

// Route schemas use camelCase variable names
export const orderCreateSchema = {
    body: z.object({
        name: z.string(),
        phone: z.string()
    })
}

// Derive DTO/VO types with z.infer to avoid hand-written duplicates
export const CreateOrderDTO = orderCreateSchema.body
export type CreateOrderDTO = z.infer<typeof orderCreateSchema.body>
```

Route:

```ts
schema: orderCreateSchema
```

Fastify validates automatically.

Controllers do not need to validate again.

---

## Mapper

Many people overlook the Mapper.

It actually matters — but it is **not mandatory for every module**.

Example:

Database:

```text
Order

id

name

orderNo

createTime
```

Returned to the frontend:

```json
{
    "id":1,
    "name":"John"
}
```

Mapper:

```ts
export function toOrderVO(entity: Order) {
    return {
        id: entity.id,
        name: entity.name
    }
}
```

When the database changes later, the frontend does not.

### When to write a Mapper — and when not to

- **Structure needs reshaping / aggregating multiple tables / fields need computation** → write a Mapper.
- **Pure field trimming (just dropping a few fields, structure unchanged)** → do not write a Mapper. Use the Zod response schema for trimming; otherwise you end up with 8 files nobody maintains.

> Principle: a Mapper exists to **change the shape**, not to **delete fields**. Leave field trimming to Zod.

---

## Where Do Transactions Go?

In the Service.

But — **do not pass `tx` down into repositories as a parameter**. That pollutes every repository signature, forces a default client even outside transactions, and is easy to get wrong.

The right way: a **request-scoped transaction context** (based on `AsyncLocalStorage`) that keeps transactions fully transparent to repositories.

### 1. A unified transaction context

```ts
// prisma/transaction-context.ts
import { PrismaClient } from "@prisma/client"
import { AsyncLocalStorage } from "async_hooks"

export const prisma = new PrismaClient()

// The transaction object type (the tx from the $transaction callback)
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

const storage = new AsyncLocalStorage<Tx>()

// Get the tx of the current context; fall back to the default client
export function getClient(): Tx | PrismaClient {
    return storage.getStore() ?? prisma
}

// Services use this to open a transaction
export function runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    // Already inside a transaction — reuse it, avoid nesting
    const existing = storage.getStore()
    if (existing) return fn(existing)

    return prisma.$transaction((tx) => storage.run(tx, () => fn(tx)))
}
```

### 2. The Service opens the transaction

```ts
import { runInTransaction } from "@/prisma/transaction-context"

export async function createOrderWithItems(dto, items) {
    return runInTransaction(async () => {
        const order = await orderRepository.create(dto)
        await orderItemRepository.create({ ...items, orderId: order.id })
        return order
    })
}
```

### 3. Repositories need no changes at all

```ts
// Inside a transaction, getClient() returns the tx automatically; outside, the default client
export async function create(data) {
    return getClient().order.create({ data })
}
```

Benefits:

- Clean repository signatures; reusable without transactional code.
- Nested `runInTransaction` calls reuse the same transaction automatically; no accidental multiple transactions.
- If Prisma is ever replaced by another ORM, only `transaction-context.ts` changes inside Services.

> **Don't**: never import `prisma` directly anywhere outside repositories to open transactions. Transactions may only be opened via `runInTransaction`.

---

## How Do Services Call Each Other?

Example:

```text
OrderService → StockService → NotifyService
```

Services may call each other.

### Rule: service dependencies must be one-directional; circular dependencies are forbidden

```text
✅ Allowed: Order → Stock → Notify
❌ Forbidden: Order ↔ Stock importing each other
```

Circular imports break startup and make tests unmockable. If two services genuinely need each other, a piece of logic should be **pushed down into a third service** (a domain service) that both depend on, rather than having them depend on each other.

> Controllers must never call each other. Controllers only call Services.

---

## Where Do Permissions Go?

Permissions have two layers with different responsibilities; do not mix them.

### Layer 1: Authentication + route-level coarse-grained authorization (middleware / hook)

Answers "does this endpoint require login? / does the caller have the `order:add` permission?".

```text
JWT → Auth Plugin → request.user → preHandler permission guard
```

```ts
fastify.addHook("preHandler", permissionGuard)   // Declarative; routes declare the permissions they need
```

### Layer 2: Business-level fine-grained authorization (in the Service)

Answers "can this user modify **this particular** order?" (judgments over concrete data). This layer depends on business data and must live in the Service:

```ts
export async function updateOrder(id, dto, user) {
    const order = await repository.findById(id)
    if (!order) throw new NotFoundError()
    if (order.ownerId !== user.id && !user.hasPermission("order:edit:any")) {
        throw new ForbiddenError()
    }
    return repository.update(id, dto)
}
```

> **Boundary**: whatever can be expressed in route config (login, permission points) stays out of Services; whatever requires querying data (data ownership, state machines) stays out of middleware.

---

## Error Handling

There must be one place that **uniformly translates exceptions into HTTP responses**, otherwise the error system never closes the loop.

### 1. Business error types

```ts
// common/errors/index.ts
export class BusinessError extends Error {
    constructor(message: string, public code = "BUSINESS_ERROR") {
        super(message)
    }
}

export class ForbiddenError extends BusinessError {
    constructor(message = "Forbidden") { super(message, "FORBIDDEN") }
}

export class NotFoundError extends BusinessError {
    constructor(message = "Resource not found") { super(message, "NOT_FOUND") }
}
```

### 2. Global error handler

```ts
// app.ts
fastify.setErrorHandler((err, req, reply) => {
    // Business errors: unified format
    if (err instanceof BusinessError) {
        return reply.send({ code: err.code, message: err.message, data: null })
    }
    // Zod / Fastify validation errors
    if (err.validation) {
        return reply.status(400).send({ code: "VALIDATION_ERROR", message: err.message, data: null })
    }
    // Everything else: log + fallback 500
    req.log.error(err)
    reply.status(500).send({ code: "INTERNAL_ERROR", message: "Internal server error", data: null })
})
```

> Services / repositories just throw; **do not** try/catch in controllers and convert to responses yourself. The response format is decided only by this global handler.

---

## Testing and Dependency Injection

Services import repository singletons directly; in tests, replace dependencies with `vi.mock`:

```ts
// service.ts
import { userRepository } from "./user.repository.ts"

export const userService = {
  async create(dto: CreateUserDTO) {
    const exists = await userRepository.findByPhone(dto.phone)
    if (exists) throw new BusinessError("Order number already exists")
    return userRepository.create(dto)
  }
}
```

```ts
// Test
import { vi } from "vitest"
import { userRepository } from "./user.repository"

vi.mock("./user.repository", () => ({
  userRepository: {
    findByPhone: vi.fn(),
    create: vi.fn(),
  }
}))

// The repository used inside userService is now replaced by the mock
```

> Services depend only on the repository interface (`import` of an object); swapping the ORM / data source leaves business logic untouched.

---

## Naming Conventions

For a consistent style:

- **Schema variables**: camelCase, matching the route (`orderCreateSchema`, `orderListSchema`).
- **Derived types**: PascalCase (`CreateOrderDTO`, `OrderVO`).
- **Controller returns**: always `return result`; do not mix in `reply.send(...)` (modern Fastify accepts a plain return).
- **Repository methods**: named after data actions (`findById`, `findByPhone`, `create`, `update`, `delete`); no business words here (`createIfNotExists`-style checks belong in the Service).

---
