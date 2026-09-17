# Admin Frontend (manage-ui)

An enterprise-grade admin frontend built on React 19 + antd 6, with a purple theme and a layout of a dynamic sidebar plus a content area.

**Language**: English | [简体中文](./README.zh.md)

## Tech Stack

| Category | Technology |
|------|------|
| Framework | React 19 |
| Language | TypeScript |
| Routing | React Router v8 (Data Mode) |
| UI library | antd v6 + @ant-design/icons v6 |
| Styling | Tailwind CSS v4 (preflight disabled) |
| State management | zustand v5 |
| HTTP client | axios (interceptor injects the Bearer token automatically) |
| Build tool | Vite 8 |

## Feature Modules

### Auth & Layout
- **Login page** (`/login`) — purple gradient background + centered card form
- **Admin layout** — deep-purple sidebar (`#1E0A2E`) + dynamic menu + top bar user dropdown + breadcrumb + sidebar collapse
- **Route guards** — loader-based auth: redirects to `/login` when there is no token, and on 401

### Page Routes

| Path | Page | Notes |
|------|------|------|
| `/login` | Login | Standalone page, no layout wrapper |
| `/` | Dashboard | Multi-panel demo homepage (relation graph / AI analysis / opportunity pipeline / interaction timeline), powered by frontend mocks (`src/pages/Dashboard/mock/`) |
| `/system/user` | User management | Searchable paginated table + CRUD + assign roles + reset password + toggle status |
| `/system/role` | Role management | Searchable paginated table + CRUD + assign permissions (tree multi-select) + toggle status |
| `/system/menu` | Menu management | Tree table + CRUD (four types: directory / menu / button / API) |
| `/system/dept` | Dept management | Tree table + search + CRUD |
| `/system/dict` | Dict management | Dict types + dict data maintenance |

### Dynamic Menu

- After login, the sidebar renders from the `menus[]` tree returned by `GET /auth/userinfo`
- Directory nodes → SubMenu groups; menu nodes → clickable nav items
- Icons are mapped from names to antd Icon components in `lib/icons.tsx`

## Project Structure

```
src/
├── api/
│   ├── auth.ts              # Login / logout / userinfo APIs
│   ├── file.ts              # File upload/download URL APIs
│   └── system.ts            # System CRUD APIs (user / role / menu / dept / dict)
├── components/
│   ├── AuthControl.tsx      # Permission-gated button (visibility by permCode)
│   └── FormModal.tsx        # Reusable form modal (shared by all create/edit dialogs)
├── hooks/
│   └── useTable.ts          # Generic list hook (pagination / search / refresh)
├── layouts/
│   ├── AdminLayout.tsx      # Admin main layout (sidebar + top bar + content)
│   └── RootLayout.tsx       # Root layout (Spin loading state)
├── lib/
│   ├── icons.tsx            # Icon name → Icon component mapping
│   ├── menu.tsx             # MenuTreeNode[] → antd MenuItems recursive conversion
│   └── request.ts           # axios wrapper (interceptors /api proxy)
├── pages/
│   ├── Login/               # Login page
│   ├── Dashboard/           # Multi-panel demo homepage (mock data layer in pages/Dashboard/mock/)
│   └── system/
│       ├── user/            # User management
│       ├── role/            # Role management
│       ├── menu/            # Menu management
│       ├── dept/            # Dept management
│       └── dict/            # Dict management
├── router/
│   ├── index.tsx            # createBrowserRouter config
│   └── routes.tsx           # Route definitions + loader auth guard
├── stores/
│   └── auth.ts              # zustand auth state (token / userInfo / menus)
├── types/
│   ├── common.ts            # PageResult / PageQuery shared types
│   └── system.ts            # System module VO/DTO types + constants
├── main.tsx                 # Entry (ConfigProvider purple theme + RouterProvider)
└── index.css                # Global styles + layout container classes
```

## Design Conventions

### Theme Colors

| Usage | Color |
|------|------|
| Primary | `#6C5AF8` (purple) |
| Dark variant | `#5F55F6` |
| Light variant | `#866CFF` |
| Menu selected / table header gradient | `#5F55F6 -> #6C5AF8 -> #866CFF` |
| Logo gradient (login page / sidebar) | `#7C3AED -> #8B5CF6` |
| Sidebar background | `#F3F0FF` (light purple, `--menu-panel-bg`) |
| Submenu background | `#150721` (deep purple) |

`colorPrimary` and friends are configured globally in the `ConfigProvider` in `main.tsx`; the menu-selected / table-header gradients live in `styles/layout.scss` and the `MyTable` component.

### Page Layout Conventions

All list pages share a common set of CSS class containers (defined in `styles/layout.scss`):

```tsx
<div className="page-col-container">          {/* Page outer wrapper: vertical flex */}
  <div className="page-search-container">     {/* Search bar area */}
    <Form className="search-form"> ... </Form>
  </div>

  <Container loading={loading} className="page-table-container">  {/* Toolbar + table + pagination */}
    <div className="page-table-toolbar">      {/* Toolbar (create button, etc.) */}
      ...
    </div>
    <MyTable />                               {/* Gradient header + auto-height */}
  </Container>
</div>
```

Changing these classes restyles every page at once — no per-page edits needed.

### Styling

Prefer TailwindCSS atomic classes; avoid inline `style` attributes.

### Shared Component Reuse

- **FormModal** — wraps Modal + Form once for all create/edit dialogs; restyling dialogs later means changing a single place
- **AuthControl** — permission-gated button driven by the user's `permissions` array
- **useTable** — the single hook used by all paginated list pages, eliminating duplicated data-fetching / pagination / search code

## Development Guide

### Start the Dev Server

```bash
# Install dependencies
pnpm install

# Start the Vite dev server (http://localhost:8090)
pnpm dev
```

Vite proxy is preconfigured: `/api` → `http://localhost:8890/api`

### Build

```bash
# Production build (includes TypeScript compile check)
pnpm build

# Preview the build output
pnpm preview
```

### Code Style

```bash
# Lint
pnpm lint

# Format
pnpm format

# Check formatting
pnpm format:check
```
