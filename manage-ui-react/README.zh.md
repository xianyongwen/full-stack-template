# 管理后台前端 (manage-ui)

基于 React 19 + antd 6 的企业级管理后台前端，采用紫色主题，左侧动态菜单 + 右侧内容区布局。

**语言**：简体中文 ｜ [English](./README.md)

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 |
| 语言 | TypeScript |
| 路由 | React Router v8（Data Mode） |
| UI 组件库 | antd v6 + @ant-design/icons v6 |
| 样式 | Tailwind CSS v4（禁用 preflight） |
| 状态管理 | zustand v5 |
| HTTP 客户端 | axios（拦截器自动注入 Bearer Token） |
| 构建工具 | Vite 8 |

## 功能模块

### 认证与布局
- **登录页** (`/login`) — 紫色渐变背景 + 居中卡片表单
- **管理后台布局** — 深紫色侧边栏（`#1E0A2E`）+ 动态菜单 + 顶栏用户下拉 + 面包屑 + 侧边栏折叠
- **路由守卫** — loader 鉴权：无 token 跳转 `/login`，401 自动跳转

### 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 独立页面，无布局包裹 |
| `/` | Dashboard | 多面板演示首页（关系图谱 / AI 分析 / 商机推进 / 互动时间轴），数据为前端 mock（`src/pages/Dashboard/mock/`） |
| `/system/user` | 用户管理 | 搜索分页表格 + CRUD + 分配角色 + 重置密码 + 状态切换 |
| `/system/role` | 角色管理 | 搜索分页表格 + CRUD + 分配权限（树形多选）+ 状态切换 |
| `/system/menu` | 菜单管理 | 树形表格 + CRUD（四种类型：目录/菜单/按钮/API） |
| `/system/dept` | 部门管理 | 树形表格 + 搜索 + CRUD |
| `/system/dict` | 字典管理 | 字典类型 + 字典数据维护 |

### 动态菜单

- 登录后从 `GET /auth/userinfo` 获取 `menus[]` 树形数据渲染侧边栏
- 目录节点 → SubMenu 分组，菜单节点 → 可点击导航项
- 图标通过 `lib/icons.tsx` 映射名称到 antd Icon 组件

## 项目结构

```
src/
├── api/
│   ├── auth.ts              # 登录/登出/获取用户信息 API
│   ├── file.ts              # 文件上传/下载地址 API
│   └── system.ts            # 系统 CRUD API（用户/角色/菜单/部门/字典）
├── components/
│   ├── AuthControl.tsx      # 权限按钮组件（按 permCode 控制显隐）
│   └── FormModal.tsx         # 通用表单弹窗（所有新增/编辑弹窗统一复用）
├── hooks/
│   └── useTable.ts           # 通用列表 hook（分页/搜索/刷新）
├── layouts/
│   ├── AdminLayout.tsx       # 管理后台主布局（侧边栏 + 顶栏 + 内容区）
│   └── RootLayout.tsx        # 根布局（Spin 加载态）
├── lib/
│   ├── icons.tsx             # 图标名 → Icon 组件映射表
│   ├── menu.tsx              # MenuTreeNode[] → antd MenuItems 递归转换
│   └── request.ts            # axios 封装（拦截器 /api 代理）
├── pages/
│   ├── Login/                # 登录页
│   ├── Dashboard/            # 多面板演示首页（mock 数据层见 pages/Dashboard/mock/）
│   └── system/
│       ├── user/             # 用户管理
│       ├── role/             # 角色管理
│       ├── menu/             # 菜单管理
│       ├── dept/             # 部门管理
│       └── dict/             # 字典管理
├── router/
│   ├── index.tsx             # createBrowserRouter 配置
│   └── routes.tsx            # 路由定义 + loader 鉴权守卫
├── stores/
│   └── auth.ts               # zustand 认证状态（token / userInfo / menus）
├── types/
│   ├── common.ts             # PageResult / PageQuery 通用类型
│   └── system.ts             # 系统模块 VO/DTO 类型 + 常量
├── main.tsx                  # 入口（ConfigProvider 紫色主题 + RouterProvider）
└── index.css                 # 全局样式 + 布局容器 class 定义
```

## 设计规范

### 主题色

| 用途 | 色值 |
|------|------|
| 主色 Primary | `#6C5AF8`（紫色） |
| 深色变体 | `#5F55F6` |
| 亮色变体 | `#866CFF` |
| 菜单选中 / 表头渐变 | `#5F55F6 -> #6C5AF8 -> #866CFF` |
| Logo 渐变（登录页 / 侧边栏） | `#7C3AED -> #8B5CF6` |
| 侧边栏背景 | `#F3F0FF`（浅紫，`--menu-panel-bg`） |
| 子菜单背景 | `#150721`（深紫） |

主色 `colorPrimary` 等在 `main.tsx` 的 `ConfigProvider` 中全局配置；菜单选中 / 表头渐变见 `styles/layout.scss` 与 `MyTable` 组件。

### 页面布局约定

所有列表页面使用统一的 CSS class 容器（定义于 `styles/layout.scss`）：

```tsx
<div className="page-col-container">          {/* 页面外层：纵向 flex 布局 */}
  <div className="page-search-container">     {/* 搜索栏区域 */}
    <Form className="search-form"> ... </Form>
  </div>

  <Container loading={loading} className="page-table-container">  {/* 操作栏 + 表格 + 分页 */}
    <div className="page-table-toolbar">      {/* 操作栏（新增按钮等） */}
      ...
    </div>
    <MyTable />                               {/* 渐变表头 + auto-height */}
  </Container>
</div>
```

修改这些 class 即可全局统一样式，无需逐页改动。

### 样式实现约定尽量使用tailwindcss原子化，避免使用style内联样式

### 通用组件复用

- **FormModal** — 所有新增/编辑弹窗统一封装 Modal + Form，后续改弹窗风格只需改一处
- **AuthControl** — 权限按钮，根据用户 `permissions` 数组控制显隐
- **useTable** — 所有分页列表页统一使用的 hook，消除重复的数据获取/分页/搜索代码

## 开发指南

### 启动开发服务

```bash
# 安装依赖
pnpm install

# 启动 Vite 开发服务器（http://localhost:8090）
pnpm dev
```

Vite 已配置代理：`/api` → `http://localhost:8890/api`

### 构建

```bash
# 生产构建（含 TypeScript 编译检查）
pnpm build

# 预览构建产物
pnpm preview
```

### 代码规范

```bash
# Lint 检查
pnpm lint

# 格式化
pnpm format

# 格式化检查
pnpm format:check
```
