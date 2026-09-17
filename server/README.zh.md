# 整体描述

后端项目使用 **Fastify + Prisma + Zod + ai-sdk** 技术栈，采用 **领域分层（Domain Driven）+ Repository + Service** 的方式，这也是目前 Node.js 社区比较主流的做法。

**语言**：简体中文 ｜ [English](./README.md)

---

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（tsx watch 热重载，使用 alias-loader 解析路径别名） |
| `npm run build` | 构建生产包（TypeScript 编译 + 路径别名替换 + 构建后处理） |
| `npm start` | 启动生产服务器（运行编译后的 `dist/index.js`） |
| `npm run prisma:generate` | 生成 Prisma Client（根据 `schema.prisma` 生成类型安全的数据库客户端） |
| `npm run prisma:migrate` | 执行数据库迁移（改完 schema 后生成迁移文件并应用到本地库） |
| `npm run prisma:reset` | 重置数据库（清库并重新执行所有迁移，仅本地使用） |
| `npm test` | 运行测试（使用 Node.js 原生 test runner + tsx） |

---

## Swagger API 文档

项目集成了 `@fastify/swagger` + `@fastify/swagger-ui`，启动后自动生成 OpenAPI 3.0 文档。

- **访问地址**：`http://127.0.0.1:8890/apiDoc`
- **自动生成**：基于 Zod schema（`fastify-type-provider-zod` 的 `jsonSchemaTransform`）自动推断请求/响应格式
- **鉴权配置**：文档内置了 Bearer Token 认证方式，可在 Swagger UI 中直接点击 "Authorize" 输入 token 后测试接口
- **环境控制**：仅开发/测试环境启用，生产环境（`NODE_ENV=production`）自动跳过路由注册，不会暴露 `/apiDoc` 路由

---

## 整体架构

```text
src
├── app.ts
├── index.ts
├── config.ts
├── cron.ts
├── seed.ts
├── worker.ts
│
├── plugins             # Fastify 插件
│   └── auth.plugin.ts
│
├── common
│   ├── errors
│   ├── utils
│   ├── constants
│   └── types
│
├── lib                 # 工具库（redis、oss、wechat、logger 等）
│
├── modules
│   ├── auth            # 认证（登录/注册/Token）
│   ├── file            # 文件上传
│   └── system          # 用户、角色、权限菜单、部门
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
│   └── prisma          # Prisma 生成的类型
│
├── types               # 类型声明
└── routes
```

真正的重点在每个 module。

例如：

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

## 每层职责

### 第一层 Route

只有一件事情：

> 注册路由

例如：

```ts
fastify.get(
    "/orders",
    {
        schema: orderListSchema
    },
    controller.list
)
```

Route 不写业务。

---

### 第二层 Controller

Controller 做三件事：

- 获取 request
- 调用 Service
- 返回 response

例如：

```ts
export async function list(req, reply) {
    const result = await orderService.list(req.query)

    return result   // Fastify 会自动序列化，统一用 return result
}
```

Controller 不写 SQL。

Controller 不写业务。

Controller 不访问 Prisma。

---

### 第三层 Service（核心）

这里是真正写业务的地方。

例如：

```ts
export async function createOrder(dto) {

    const exists = await repository.findByOrderNo(dto.orderNo)

    if (exists) {
        throw new BusinessError("订单号已存在")
    }

    return repository.create(dto)
}
```

这里可以：

- 权限判断（业务级，见下文"权限放哪里"）
- MQ
- Redis
- 文件
- 调其它Service
- Transaction

所有业务都放这里。

---

### 第四层 Repository

这里只有 Prisma。

Repository **不感知事务**，通过统一的数据访问入口拿 client：

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

> 注意：Repository 的方法签名里**不再出现 `tx` 参数**。事务由 Service 开启，通过请求级上下文（AsyncLocalStorage）自动传递给所有 Repository（详见"Transaction 放哪里"）。

Repository 不做业务。

Repository 只负责数据库。

---

### Prisma

Prisma 作为 ORM。

Repository：

↓

Prisma Client / Transaction（由上下文决定）

↓

MySQL

---

## 数据库表结构变更（schema.prisma）

> **唯一真相来源是 `prisma/schema.prisma`。禁止任何人通过 SQL 或数据库客户端直接改表结构。**

### 规则

- **只改 schema.prisma，不直接改库。** 无论是加字段、改类型、加索引、加表，都先在 `schema.prisma` 里改，再通过 Prisma 的迁移流程同步到数据库。
- **每一次结构变更都要生成迁移文件并提交到仓库。** 迁移文件是部署和团队同步的依据，不能省略，不能只在本地 `db push` 然后不提交。
- **迁移文件一旦合并到主干，禁止再修改。** 它是不可变的历史记录。改结构请发起新迁移，不要回头改旧的。
- **环境差异只靠迁移解决。** 测试库、预发库、生产库的表结构必须由同一套迁移文件逐个回放得到，不允许在各环境手动调整。

### 标准流程

```bash
# 1. 改 schema.prisma（加字段、改类型、加索引 …）

# 2. 生成迁移文件（会自动算出 diff，并在本地执行）
npx prisma migrate dev --name add_order_status

# 3. 检查生成的迁移 SQL：prisma/migrations/<timestamp>_add_order_status/migration.sql

# 4. 提交 schema.prisma 和 migrations/ 目录

# 5. 其它人 / CI / 生产环境回放迁移
npx prisma migrate deploy
```

### 各命令的用途（不要混用）

| 命令 | 用途 | 适用环境 |
| --- | --- | --- |
| `prisma migrate dev` | 改完 schema 后**生成迁移**并执行 | 仅本地开发 |
| `prisma migrate deploy` | **回放**已有迁移，不生成新迁移 | CI、测试、预发、生产 |
| `prisma db push` | 直接把 schema 推到库，**不生成迁移文件** | 仅原型 / 早期试错，正式环境禁用 |
| `prisma migrate reset` | 清库重跑所有迁移 | 仅本地，会清数据 |

### 禁忌

- ❌ 在数据库里手动 `ALTER TABLE` / `CREATE TABLE`。
- ❌ 用 `db push` 代替 `migrate dev`（它不留迁移记录，多人协作时会丢结构）。
- ❌ 直接编辑 `migrations/` 下已生成的 SQL 文件。
- ❌ 删掉某个迁移文件去"修正"历史——发新迁移覆盖。
- ❌ 改了 schema 但只更新了本地库，没生成迁移、没提交。

---

## 主键设计：UUID v4

本项目所有表的主键统一使用 **UUID v4**（Prisma 的 `@default(uuid())`），而不是传统自增 ID。

### 为什么不用自增 BigInt？

| 场景 | 自增 BigInt | UUID v4 |
| --- | --- | --- |
| 暴露用户/订单 ID | ❌ 可遍历、可估算数据量 | ✅ 不可猜测 |
| 前端使用 | ❌ 需处理 BigInt 序列化问题 | ✅ 天然字符串，无序列化烦恼 |
| 分库分表 / 分布式 | ❌ 依赖数据库自增，冲突风险 | ✅ 客户端生成，全局唯一 |
| 数据合并 | ❌ 跨库合并时 ID 冲突 | ✅ 天然无冲突 |

### 实践

```prisma
model SysUser {
  id  String  @id @default(uuid()) @db.Uuid
  // ...
}
```

- `@db.Uuid` 映射到 PostgreSQL 的 `uuid` 类型（16 字节，比 `varchar(36)` 更省空间且带索引优化）。
- 关联外键也使用 `String @db.Uuid` 类型。
- `parentId` 这类表示"无父级"的字段，默认值使用 `NIL_UUID` 常量（`00000000-0000-0000-0000-000000000000`）。

> **权衡**：UUID v4 是完全随机生成的，对 B+ 树索引写入不如自增 ID 友好。如果表达到亿级且有极高写入吞吐，可考虑换用 **UUID v7**（按时间排序）——需要数据库安装 `pg_uuidv7` 扩展，schema 中写 `@default(dbgenerated("uuid_generate_v7()"))`。目前项目规模下 UUID v4 的索引性能完全够用。

---

## Zod 放哪里？

建议：

```text
order.schema.ts
```

例如：

```ts
import { z } from "zod"

// 路由用的 schema 统一用 camelCase 变量名
export const orderCreateSchema = {
    body: z.object({
        name: z.string(),
        phone: z.string()
    })
}

// 用 z.infer 自动推导 DTO/VO 类型，避免手写重复
export const CreateOrderDTO = orderCreateSchema.body
export type CreateOrderDTO = z.infer<typeof orderCreateSchema.body>
```

Route：

```ts
schema: orderCreateSchema
```

Fastify 自动校验。

Controller 不需要再 validate。

---

## Mapper

很多人忽略 Mapper。

实际上很重要——但**不是所有模块都强制写**。

例如：

数据库：

```text
Order

id

name

orderNo

createTime
```

返回给前端：

```json
{
    "id":1,
    "name":"张三"
}
```

Mapper：

```ts
export function toOrderVO(entity: Order) {
    return {
        id: entity.id,
        name: entity.name
    }
}
```

以后数据库改了，前端不用改。

### 什么时候写 Mapper？什么时候不写？

- **结构需要重组 / 聚合多张表 / 字段需要计算转换** → 写 Mapper。
- **纯字段裁剪（只去几个字段，结构不变）** → 不要写 Mapper。直接用 Zod response schema 做响应裁剪即可，否则 8 个文件没人维护。

> 原则：Mapper 是为了**改变形状**，不是为了**删字段**。删字段交给 Zod。

---

## Transaction 放哪里？

应该放 Service。

但是——**不要把 `tx` 当参数一层层传进 Repository**。那样会污染所有 Repository 签名，无事务时也得传默认 client，且容易传错。

正确做法：**用请求级事务上下文**（基于 `AsyncLocalStorage`），让事务对 Repository 完全透明。

### 1. 统一的事务上下文

```ts
// prisma/transaction-context.ts
import { PrismaClient } from "@prisma/client"
import { AsyncLocalStorage } from "async_hooks"

export const prisma = new PrismaClient()

// 事务对象的类型（就是 $transaction 回调里的那个 tx）
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

const storage = new AsyncLocalStorage<Tx>()

// 取当前上下文的 tx，没有则用默认 client
export function getClient(): Tx | PrismaClient {
    return storage.getStore() ?? prisma
}

// Service 用它开事务
export function runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    // 已经在事务里了，直接复用，避免嵌套
    const existing = storage.getStore()
    if (existing) return fn(existing)

    return prisma.$transaction((tx) => storage.run(tx, () => fn(tx)))
}
```

### 2. Service 开事务

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

### 3. Repository 不需要任何改动

```ts
// 事务里调的 getClient() 自动返回 tx，事务外返回默认 client
export async function create(data) {
    return getClient().order.create({ data })
}
```

好处：

- Repository 签名干净，无事务代码也能复用。
- 嵌套调用 `runInTransaction` 自动复用同一事务，不会误开多个。
- 如果未来从 Prisma 切换到别的 ORM，Service 里只改 `transaction-context.ts`。

> **禁忌**：任何地方都不要把 `prisma` 直接 import 进 Repository 之外去开事务。事务只能通过 `runInTransaction` 开启。

---

## Service 之间如何调用？

例如：

```text
OrderService → StockService → NotifyService
```

Service 可以互相调用。

### 规则：Service 之间只能单向依赖，禁止循环依赖

```text
✅ 允许：Order → Stock → Notify
❌ 禁止：Order ↔ Stock 互相 import
```

循环 import 会导致启动时报错、测试无法 Mock。如果两个 Service 确实互相需要，说明有一块逻辑应该**下沉到第三个 Service**（领域服务），让二者都依赖它，而不是互相依赖。

> Controller 永远不要互相调用。Controller 只调 Service。

---

## 权限放哪里？

权限分两层，职责不同，不要混在一起。

### 第一层：认证 + 路由级粗粒度授权（放 middleware / hook）

负责"这个接口需要登录吗 / 调用者有没有 `order:add` 这个权限点"。

```text
JWT → Auth Plugin → request.user → preHandler 权限守卫
```

```ts
fastify.addHook("preHandler", permissionGuard)   // 声明式，路由配置里写需要的权限点
```

### 第二层：业务级细粒度授权（放 Service）

负责"这个用户能不能改**这一条** order"（即对具体数据的判断）。这层判断依赖业务数据，必须在 Service 里做：

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

> **边界**：能写在路由配置里的（登录、权限点），别下沉到 Service；必须查数据才能判断的（数据归属、状态机），别上抛到 middleware。

---

## 错误处理

必须有一处**统一把异常翻译成 HTTP 响应**，否则这套错误体系无法闭环。

### 1. 业务错误类型

```ts
// common/errors/index.ts
export class BusinessError extends Error {
    constructor(message: string, public code = "BUSINESS_ERROR") {
        super(message)
    }
}

export class ForbiddenError extends BusinessError {
    constructor(message = "无权限") { super(message, "FORBIDDEN") }
}

export class NotFoundError extends BusinessError {
    constructor(message = "资源不存在") { super(message, "NOT_FOUND") }
}
```

### 2. 全局错误处理器

```ts
// app.ts
fastify.setErrorHandler((err, req, reply) => {
    // 业务错误：统一格式返回
    if (err instanceof BusinessError) {
        return reply.send({ code: err.code, message: err.message, data: null })
    }
    // Zod / Fastify 校验错误
    if (err.validation) {
        return reply.status(400).send({ code: "VALIDATION_ERROR", message: err.message, data: null })
    }
    // 其它：记日志 + 兜底 500
    req.log.error(err)
    reply.status(500).send({ code: "INTERNAL_ERROR", message: "服务器内部错误", data: null })
})
```

> Service / Repository 只管 throw，**不要**自己在 Controller 里 try/catch 转成响应。响应格式只由这个全局处理器决定。

---

## 测试与依赖注入

Service 直接 import Repository 单例，测试时通过 `vi.mock` 替换依赖：

```ts
// service.ts
import { userRepository } from "./user.repository.ts"

export const userService = {
  async create(dto: CreateUserDTO) {
    const exists = await userRepository.findByPhone(dto.phone)
    if (exists) throw new BusinessError("订单号已存在")
    return userRepository.create(dto)
  }
}
```

```ts
// 测试
import { vi } from "vitest"
import { userRepository } from "./user.repository"

vi.mock("./user.repository", () => ({
  userRepository: {
    findByPhone: vi.fn(),
    create: vi.fn(),
  }
}))

// 现在 userService 里用的 repository 自动被 mock 替换
```

> Service 只依赖 Repository 接口（`import` 的只是一个对象），换 ORM / 换数据源时业务逻辑不动。

---

## 命名约定

为了风格统一：

- **Schema 变量**：camelCase，与路由对应（`orderCreateSchema`、`orderListSchema`）。
- **推导出的类型**：PascalCase（`CreateOrderDTO`、`OrderVO`）。
- **Controller 返回**：统一 `return result`，不再 `reply.send(...)` 混用（新版 Fastify 直接 return 即可）。
- **Repository 方法**：以数据动作为准（`findById`、`findByPhone`、`create`、`update`、`delete`），不要在这里出现业务词（`createIfNotExists` 这种判断属于 Service）。

---
