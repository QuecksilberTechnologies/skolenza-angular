# 🚀 AxionPro HRMS

A modern, multi-tenant Human Resource Management System built with **Angular 22** and **Optimus UI**. Designed to help organizations manage their workforce, streamline HR processes, and empower employees and HR teams with intuitive tools.

---

## ✨ Key Features

### 👥 Employee Management

- Add, edit, and manage employee records and profiles
- Department and designation management
- Role-based access control (Host, Admin, Employee)

### 📅 Leave Management

- Apply, approve, and track leave requests
- Leave policy configuration and management
- Holiday calendar

### 🎫 Ticketing System

- Raise and track support tickets

### 📦 Asset Management

- Track and manage company assets assigned to employees

### 📊 Projects

- Project tracking and management with detailed views

### 🏢 Multi-Tenant Architecture

- Tenant management for SaaS deployment
- Subscription and edition management
- Per-tenant configuration and policies

### 🌐 Internationalization

- Multi-language support via `ngx-translate`

---

## 🛠️ Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| 🅰️ Framework  | Angular 22 (Standalone Components, Signals, OnPush) |
| 🎨 UI Library | Optimus UI 1 with Optimus Themes                    |
| 💨 Styling    | Tailwind CSS 4                                      |
| 🔷 Icons      | Lucide Angular, OpenNG Icons                        |
| 📅 Calendar   | FullCalendar                                        |
| 📈 Charts     | Chart.js                                            |
| 🌍 i18n       | ngx-translate                                       |
| 📱 PWA        | Angular Service Worker                              |
| 🧪 Testing    | Vitest                                              |
| 🔍 Linting    | ESLint with Angular ESLint                          |
| 💅 Formatting | Oxfmt (oxc)                                         |

---

## 🏁 Getting Started

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) v18+ 🟢
- [Angular CLI](https://angular.dev/tools/cli) v21+ 🅰️
- [Git](https://git-scm.com/) 🐙

### 📦 Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd axionpro-app
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Start the development server:**

   ```bash
   bun start
   ```

   The app will be available at [http://localhost:4200](http://localhost:4200) 🌐

### 🔧 Available Scripts

| Script                 | Description                            |
| ---------------------- | -------------------------------------- |
| `bun start`            | 🚀 Start the development server        |
| `bun run build`        | 📦 Build for production                |
| `bun run watch`        | 👀 Build with watch mode (development) |
| `bun run test`         | 🧪 Run unit tests                      |
| `bun run lint`         | 🔍 Lint the codebase                   |
| `bun run format`       | 💅 Format code with Oxfmt              |
| `bun run format:check` | ✅ Check formatting without writing    |

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── core/           🔒 Guards, interceptors, core services
│   ├── features/       📂 Feature modules (lazy-loaded)
│   │   ├── authentication/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── leaves/
│   │   ├── holidays/
│   │   ├── assets-management/
│   │   ├── tickets/
│   │   ├── projects/
│   │   ├── departments/
│   │   ├── designations/
│   │   ├── roles/
│   │   ├── policies/
│   │   ├── host/       🏢 Tenant, subscription & edition management
│   │   └── user-menu/  👤 Profile, settings, password & language
│   ├── layout/         📐 App shell and layout components
│   └── app.routes.ts   🗺️ Root routing configuration
├── environments/       ⚙️ Environment configurations
└── styles.css          🎨 Global styles
```

---

## ⚡ Architecture Highlights

- 🧩 **Standalone Components** — No NgModules, fully standalone architecture
- 📡 **Signals** — Reactive state management with Angular signals
- 🔄 **OnPush Change Detection** — Performance-optimized rendering
- 🚦 **Lazy Loading** — All feature routes are lazy-loaded
- 🔐 **Route Guards** — Authentication-protected routes
- 📱 **PWA Ready** — Installable progressive web app with service worker

---

## 🔐 Role-Based Module Permissions

The app gates UI and routes based on the logged-in user's role permissions, fetched from
`GET /api/UserModuleRolePermission/get-role-based-permissions?RoleId={id}`.

### API response shape

The endpoint returns a **flat array** of permission rows (NOT a nested
`{ modules: [...] }` structure):

```jsonc
{
  "isSucceeded": true,
  "data": [
    {
      "id": 873,
      "roleId": 57,
      "moduleId": 4,
      "operationId": 1,
      "hasAccess": true,
      "isActive": true,
    },
    {
      "id": 874,
      "roleId": 57,
      "moduleId": 4,
      "operationId": 2,
      "hasAccess": true,
      "isActive": true,
    },
    // ...
  ],
}
```

Names (`moduleName`, `operationName`) are **not** in this response — they must be
resolved via `GET /api/Tenant/get-all-tenant-operations?IsActive=true`, which returns
the full module/operation catalog with `id` + names. Always match the two datasets by
`moduleId` + `operationId` (IDs), never by name. The flat row type is
`RolePermissionEntry` in `src/app/shared/interfaces/tenant-operation.ts`.

### How it works

- **Store**: `src/app/core/stores/current-user-permissions.store.ts` — root-provided NgRx
  signal store that holds `modules`, `isLoading`, `isLoaded`. On `load(roleId)` it
  `forkJoin`s `getRoleBasedPermissions` + `getTenantOperations` and calls
  `enrichPermissions()` to join the flat rows with the catalog into a nested
  `RoleModulePermission[]` shape so callers can still query by name.
- **Fetch points**:
  - On login (`features/authentication/login/login.ts`) right after `setLoginData`.
  - On cold start via `onInit` hook reading `loginInfo` from `StorageApi`.
- **Cleared on logout** in `layout/app-header/app-header.ts`.

### API for components

```ts
const perms = inject(CurrentUserPermissionsStore);

perms.canAccess('Employees'); // true if user has any operation on Employees
perms.canPerform('Employees', 'Add'); // true if user can Add on Employees
perms.canAccessOrUnknown('Employees'); // permissive: true while loading or if untracked
perms.isKnownModule('Employees'); // true if module is in the API response
perms.modules(); // raw RoleModulePermission[] signal
```

> Use `canAccess` / `canPerform` for hard gating (action buttons, destructive ops).
> Use `canAccessOrUnknown` for soft gating (menus, navigation) so untracked legacy
> modules stay visible until the backend lists them.

### Sidebar menu

Each item in `layout/app-aside-menu/app-aside-menu.ts` carries an optional `moduleKey`
on `IAsideMenuItem`. Items without a `moduleKey` (e.g. Dashboard) are always visible;
tagged items are filtered through `canAccessOrUnknown(moduleKey)`.

### Route guard

```ts
import { hasModulePermissionGuard } from '@core/guards';

{
  path: 'roles',
  loadComponent: () => import('./roles-list/roles-list'),
  canActivate: [hasModulePermissionGuard('Roles')],
}
```

If the user lacks access, the guard shows an error toast and redirects to `/`.

### Permission matrix UI (assign page)

The `PermissionMatrix` shared component (`src/app/shared/components/permission-matrix/`)
powers both the **Role Permissions** (`features/roles/role-permissions/`) and
**Employee Permissions** (`features/employees/employees-permissions/`) pages.

- **Inputs**:
  - `tenantModules: TenantModule[]` — full matrix structure from
    `getTenantOperations()`. Defines every row (operation) and column (module).
  - `rolePermissions: RolePermissionEntry[]` — flat rows from
    `getRoleBasedPermissions(roleId)` or `getEmployeePermissions(employeeId)`. Drives
    the initial checked state.
- **Pre-selection logic**: The component builds a `Set<"${moduleId}-${operationId}">`
  of granted pairs (where `hasAccess && isActive !== false`), then walks each tenant
  cell and checks membership. This matches by IDs — case, whitespace, and localisation
  of names are irrelevant.
- **Save**: `onSave` emits a `PermissionSavePayload` with `moduleId`, `moduleName`,
  `operationId`, `operationName`, and `hasAccess` per cell, which the store then POSTs
  to `/UserModuleRolePermission/assign-role-permissions` (or
  `/assign-employee-permissions`).

> Don't hard-code operation names (Add/Update/Delete/View/Approve/…) or operation
> type labels (CRUD/WorkFlow/Status/Actions) as enums. The catalog comes from
> `getTenantOperations()` at runtime; an enum would drift from the backend. The
> `OPERATION_ICONS` / `OPERATION_TYPE_LABELS` maps inside `PermissionMatrix` are
> display-only lookups keyed by the strings the API returns.

### ⚠️ Module name matching

The `moduleKey` strings (`'Employees'`, `'Roles'`, `'Holidays'`, etc.) must match the
backend's `moduleName` exactly (case-insensitive). After login, inspect
`permsStore.modules()` in DevTools or the API response and adjust `moduleKey` values
in `app-aside-menu.ts` and route files if the backend uses different names.

---

🚀 Happy HR managing!
