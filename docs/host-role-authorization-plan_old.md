# Host Role-Based Authorization

## Context

Every Host user (`roleTypeId 0`) currently gets full platform/super-admin access. The root cause is a single line in `src/app/core/stores/current-user-permissions.store.ts:160-161`:

```ts
const isSuperAdmin =
  isHostLogin(loginInfo) ||
  [employeeInfo?.userPrimaryRole?.roleName, employeeInfo?.roleTypeName].some(...);
```

`isSuperAdmin` short-circuits `canAccess()`, `canPerform()`, `canAccessOrUnknown()` and `ensureLoaded()` to `true`, so **any** host login bypasses every permission check. Host routes are gated only by `hostOnly = roleTypeGuard([0])` (`features.routes.ts:9`), and none of the host entries in `public/data/aside-menu.json` carry a `moduleKey`. The result: a host user created with a restricted host role (e.g. "Support", "Billing") can reach Tenants, Subscriptions, Modules, Host Users and Host Roles — the same surface as the platform owner.

The backend already models this correctly. `GET /HostRolePermission/get-role-module-permissions/{hostRoleId}` returns the host module catalog with a per-operation `isAllowed` flag, and `HostApi.getHostRoleModulePermissions()` (`src/app/core/services/host-api.ts:108-124`) already wraps it. Today that endpoint is consumed **only** by the admin screen that edits _other_ roles (`features/host/roles/host-role-permissions/host-role-permissions.store.ts:96-120`) — nothing ever reads the _current_ host user's own permissions.

**Outcome:** the host console becomes permission-driven exactly like the tenant side. Only host role id `1` (seeded Super Admin) keeps implicit full access; every other host user sees and can act on only what their host role grants.

### Decisions already taken

| Question              | Decision                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Super Admin detection | `hostUser.hostRoleId === 1` constant                                                                 |
| Permission source     | `GET /HostRolePermission/get-role-module-permissions/{hostRoleId}`                                   |
| Scope                 | Route guards + aside-menu filtering + action-level (Add/Edit/Delete) gating. Tests **not** in scope. |

---

## Step 0 — Discovery (do this first, it drives every literal string)

The `moduleName` and `operationName` strings the backend returns for host modules are not known from the frontend. Everything below uses placeholder keys that must be confirmed before coding.

1. Log in as the Super Admin host user and capture the response of
   `GET /HostRolePermission/get-role-module-permissions/1` (and `GET /Host/get-host-modules`).
   Swagger: https://axionpro-api.onrender.com/swagger/index.html
2. Record the exact `modules[].moduleName` values and the `modules[].operations[].operationName` values.
3. Confirm whether the response returns **the full host module catalog** (allowed and not-allowed rows) or **only granted rows**. `host-role-permissions.store.ts:38-39` asserts the former; the fail-closed decision in Step 2 depends on it.

**Verify:** you have a written list of host module names + operation names. Put them in the table in Step 3 and Step 5 before writing code.

---

## Step 1 — Teach `CurrentUserPermissionsStore` about host sessions

**File:** `src/app/core/stores/current-user-permissions.store.ts`

Extend the existing store rather than adding a `HostPermissionsStore`. Rationale: `app-aside-menu.ts:134` and `has-module-permission-guard.ts:19` already call this store, `RoleModulePermission` is the exact shape the host response maps to, and the `loadPromise`/`ensureLoaded()` race protection already exists. A second store would mean touching the menu, the guard, and every call site.

### 1a. Add an adapter next to `enrichPermissions()`

`HostRoleModulePermissionRow[]` → `RoleModulePermission[]` is a direct 1:1 map. Mirror the existing adapter in `host-role-permissions.store.ts:40-53` (which already picks `operationType = 1` because the host endpoint carries no operation type).

```ts
/** The host endpoint carries no operation type; the runtime checks never read it. */
const HOST_OPERATION_TYPE = 1;

function toHostPermissions(rows: HostRoleModulePermissionRow[]): RoleModulePermission[] {
  return rows.map((mod) => ({
    moduleId: mod.moduleId,
    moduleName: mod.moduleName,
    operations: mod.operations.map((op) => ({
      operationId: op.operationId,
      operationName: op.operationName,
      operationType: HOST_OPERATION_TYPE,
      hasAccess: op.isAllowed,
    })),
  }));
}
```

### 1b. Add `isHostSession` to state

```ts
const SUPER_ADMIN_HOST_ROLE_ID = 1;

interface CurrentUserPermissionsState {
  modules: RoleModulePermission[];
  isLoading: boolean;
  isLoaded: boolean;
  isSuperAdmin: boolean;
  /** Host sessions have a closed module catalog, so unknown modules must fail closed. */
  isHostSession: boolean;
}
```

`isHostSession: false` in `initialState` (so `clear()` on logout resets it — `app-header.ts:84`).

### 1c. Add `runHostLoad()` alongside `runLoad()`

Same `Promise` + `loadPromise` technique as `runLoad()` (`:88-110`) so `ensureLoaded()` can await it.

```ts
const runHostLoad = (hostRoleId: number): Promise<void> =>
  new Promise<void>((resolve) => {
    patchState(store, { isLoading: true });
    hostApi
      .getHostRoleModulePermissions(hostRoleId)
      .pipe(
        finalize(() => {
          patchState(store, { isLoading: false });
          resolve();
        }),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (!res?.isSucceeded) return;
          patchState(store, {
            modules: toHostPermissions(res.data?.modules ?? []),
            isLoaded: true,
          });
        },
      });
  });
```

Inject `HostApi` from `@core/services` next to `RolesApi` / `TenantsApi` (`:76-77`).

> Note: `runHostLoad` deliberately leaves `isLoaded: false` when the call errors or `isSucceeded` is false. Combined with `isHostSession` (Step 1d) that is the fail-closed path.

### 1d. Rewrite `loadFromStorage()` — the actual bug fix

```ts
async loadFromStorage(): Promise<void> {
  const loginInfo = (await storageApi.getItem('loginInfo')) as LoginInfo | null;

  if (isHostLogin(loginInfo)) {
    const hostRoleId = loginInfo?.hostUser?.hostRoleId;
    // Only the seeded platform-owner role keeps implicit full access.
    const isSuperAdmin = hostRoleId === SUPER_ADMIN_HOST_ROLE_ID;
    patchState(store, { isHostSession: true, isSuperAdmin });
    if (!isSuperAdmin && hostRoleId) {
      loadPromise = runHostLoad(hostRoleId);
    }
    return;
  }

  const employeeInfo = loginInfo?.employeeInfo;
  const isSuperAdmin = [
    employeeInfo?.userPrimaryRole?.roleName,
    employeeInfo?.roleTypeName,
  ].some((name) => name?.trim().toLowerCase() === SUPER_ADMIN_ROLE_NAME);
  patchState(store, { isHostSession: false, isSuperAdmin });

  const roleId = employeeInfo?.userPrimaryRole?.roleId;
  if (roleId) this.load(roleId);
}
```

The tenant branch is byte-for-byte the current behaviour minus the `isHostLogin(...) ||` term. Tenant users are unaffected.

### 1e. Make `canAccessOrUnknown()` fail closed for hosts

Today (`:140-145`) it returns `true` for any module not in the catalog and for `!isLoaded`. That is correct for tenants (`Roles`/`Leaves` are legitimately absent from `get-all-tenant-operations`) but wrong for hosts, where the response _is_ the complete host catalog.

```ts
canAccessOrUnknown(moduleName: string): boolean {
  if (store.isSuperAdmin()) return true;
  if (store.isHostSession()) return this.canAccess(moduleName); // closed catalog
  if (!store.isLoaded()) return true;
  const mod = findModule(moduleName);
  if (!mod) return true;
  return mod.operations.some((op) => op.hasAccess);
},
```

`canAccess()` (`:130-134`) and `canPerform()` (`:147-154`) already fail closed on an unknown module — no change needed there.

### 1f. `ensureLoaded()`

No change required. `:121` short-circuits on `isSuperAdmin() || isLoaded()`, and `:122` falls back to `loadFromStorage()` when no load has started, which now covers the host branch.

**Verify:** `bun run build` clean. In the browser, log in as a restricted host user and inspect the store — `isHostSession: true`, `isSuperAdmin: false`, `modules` populated from the host endpoint.

---

## Step 2 — Login and cold-start paths

**Files:** `src/app/features/authentication/login/login.ts`, store `withHooks`

Both entry points already call `permissionsStore.loadFromStorage()`:

- Login: `login.ts:152`, immediately after `authApi.setLoginInfo(data)` persists `loginInfo` to storage — so `hostUser.hostRoleId` is readable. **No change.**
- Cold start / refresh: `current-user-permissions.store.ts:174-178` `withHooks({ onInit })`. **No change.**
- Logout: `app-header.ts:84` calls `clear()`, which resets to `initialState` including the new `isHostSession: false`. **No change.**

**Verify:** hard-refresh (F5) on `/app/host-users` as a restricted host user and confirm the guard still denies — the `onInit` hook plus `ensureLoaded()`'s `loadPromise` await must win the race against navigation.

---

## Step 3 — Route guards

Reuse the existing `hasModulePermissionGuard(moduleKey)` (`src/app/core/guards/has-module-permission-guard.ts`) — **do not add a new guard.** It already awaits `ensureLoaded()` then calls `canAccessOrUnknown()`, which Step 1e made host-aware. Its deny path (toast + `authApi.redirectToDashboard()`) lands a host on `/app/host-dashboard` (`auth-api.ts:131-153`), which is a safe destination.

**File:** `src/app/features/features.routes.ts` — pair each host route's `hostOnly` with a module gate. Replace the shared `canActivate: hostOnly` with per-route arrays:

| Route            | Line       | New `canActivate`                                            |
| ---------------- | ---------- | ------------------------------------------------------------ |
| `host-dashboard` | `:16-21`   | `hostOnly` — leave as-is, it is the fallback destination     |
| `host-users`     | `:171-176` | `[...hostOnly, hasModulePermissionGuard('<HostUsers>')]`     |
| `host-roles`     | `:177-182` | `[...hostOnly, hasModulePermissionGuard('<HostRoles>')]`     |
| `tenants`        | `:183-188` | `[...hostOnly, hasModulePermissionGuard('<Tenants>')]`       |
| `subscriptions`  | `:189-194` | `[...hostOnly, hasModulePermissionGuard('<Subscriptions>')]` |
| `modules`        | `:195-200` | `[...hostOnly, hasModulePermissionGuard('<Modules>')]`       |

`<...>` = the exact `moduleName` from Step 0.

**Child route files.** Angular applies the parent `canActivate` to children, so the parent gate covers them. Two gaps are worth closing explicitly because they are separately addressable surfaces:

- `src/app/features/host/roles/host-roles.routes.ts:12-18` — `permissions/:hostRoleId` is the screen that _grants_ host permissions. Add `canActivate: [hasModulePermissionGuard('<HostRoles>')]` so it is not reachable if the parent gate is ever loosened.
- `src/app/features/host/modules/modules.routes.ts` — the four children (``, `sub-modules`, `operations`, `module-operations`) are unguarded. If Step 0 shows the backend models them as **separate** host modules, gate each with its own key; if they are one `Modules` module, leave them to the parent gate.

**Verify:** as a restricted host user with no `Tenants` grant, type `/app/tenants` in the address bar — expect the toast "You do not have access to …" and a redirect to `/app/host-dashboard`.

---

## Step 4 — Aside menu

**File:** `public/data/aside-menu.json` (host bucket, lines 2-49)

Add a `moduleKey` to each host `management` entry using the same strings as Step 3. `app-aside-menu.ts:131-137` `#filterItems` already drops items whose `moduleKey` fails `canAccessOrUnknown()` — no component change needed for this part.

```json
{ "id": "host-users",     "label": "Users",         "route": "host-users",     "moduleKey": "<HostUsers>",     ... },
{ "id": "host-roles",     "label": "Roles",         "route": "host-roles",     "moduleKey": "<HostRoles>",     ... },
{ "id": "tenants",        "label": "Tenants",       "route": "tenants",        "moduleKey": "<Tenants>",       ... },
{ "id": "subscriptions",  "label": "Subscriptions", "route": "subscriptions",  "moduleKey": "<Subscriptions>", ... },
{ "id": "modules",        "label": "Modules",       "route": "modules",        "moduleKey": "<Modules>",       ... }
```

Leave `host-dashboard` (host `main`) without a `moduleKey` — it is the redirect target and must always be reachable.

**Shared `settings` section.** `app-aside-menu.ts:84` appends `data.settings` to _every_ role bucket, including host. That entry routes to `setting`, which is the **tenant** brand-identity/appearance/locale screen and carries no guard at all (`features.routes.ts:127-133`). A host has no tenant to configure. Drop it for hosts:

```ts
// app-aside-menu.ts, inside `sections` computed (~:81-85)
const isHost = this.#roleKey(role) === 'host';
const raw: IAsideMenuSection[] = [
  { label: 'Main menu', items: group.main },
  { label: 'Management', items: group.management },
  ...(isHost ? [] : [{ label: 'Settings', items: data.settings }]),
];
```

and add the matching route gate in `features.routes.ts:127-133`:

```ts
{ path: 'setting', ..., canActivate: allStaff },   // allStaff = [1,2,3], excludes host
```

`app-aside-menu.ts:57-59` `permissionsReady` needs no change — a restricted host is no longer `isSuperAdmin`, so it correctly waits on `isLoaded()`.

**Verify:** log in as a restricted host — the sidebar shows only Dashboard plus the granted management entries, and no Settings section.

---

## Step 5 — Action-level gating

Follow the existing pattern from the leaves feature verbatim:

- Template: `src/app/features/leaves/leave-requests/leave-rules/leave-rules.html:19` — `@if (permissionsStore.canPerform('Leaves', 'Add')) { <p-button ... /> }`
- Row menu: `leave-rules.ts:59-60` — push `MenuItem`s conditionally.

Inject in each component: `protected readonly permissionsStore = inject(CurrentUserPermissionsStore);` (must be `protected`/`public`, not `#private`, to be template-visible).

Operation names below are placeholders pending Step 0 (`Add` / `Update` / `Delete` are the tenant-side names — confirm the host catalog uses the same).

| Component                                          | Toolbar button (`.html`)                         | Row-menu items (`.ts`)                                                                                             |
| -------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `host/users/host-users`                            | `.html:46-47` "Add User" → `canPerform(k,'Add')` | `.ts:98-121` Edit → `Update`; Reset Password → `Update` (or its own op); Delete → `Delete`                         |
| `host/roles/host-roles`                            | `.html:47` "Add Role"                            | `.ts:96-112` Permissions → `Update`; Edit → `Update`; Delete → `Delete`                                            |
| `host/tenants/tenants`                             | `.html:59` "Create Tenant"                       | `.ts:64-77` Send Verification Email → `Update`; Edit → `Update`; Delete → `Delete`                                 |
| `host/subscriptions/subscriptions`                 | `.html:50` "Create Subscription"                 | `.ts:99-127` View Details / View Modules → `View`; Edit → `Update`; Activate / Deactivate → `Update` (or `Status`) |
| `host/modules/parent-modules/parent-modules`       | `.html:60` "Add Parent Module"                   | `.ts:98…` Edit → `Update`, Delete → `Delete`                                                                       |
| `host/modules/sub-modules/sub-modules`             | `.html:76` "Add Sub Module"                      | `.ts:94…` Edit / Delete                                                                                            |
| `host/modules/operations/operations`               | `.html:61` "Add Operation"                       | `.ts:92,98` Edit / Delete                                                                                          |
| `host/modules/module-operations/module-operations` | `.html:78` "Add Module Operation"                | `.ts:89,95` Edit / Delete                                                                                          |

Cross-navigation `MenuItem`s inside the modules screens (`parent-modules.ts:85-88`, `sub-modules.ts:81-84`, `operations.ts:79-82`, `module-operations.ts:80-82` — "Sub Modules", "Operations", "Module Operations" `routerLink`s) point at sibling routes. If Step 0 shows those are separate host modules, gate each link with `canAccess('<key>')`; otherwise leave them.

**Verify:** as a host user granted `View` only on Tenants, the Tenants page loads but "Create Tenant" is absent and the row menu shows no Edit/Delete.

---

## Failure modes

| Situation                                                  | Behaviour                                                                                          | Why                                                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `hostRoleId === 1`                                         | Full access, no fetch                                                                              | Explicit super-admin bypass — guarantees the platform owner can never be locked out             |
| Permission API errors or `isSucceeded: false`              | `isLoaded` stays `false`, `modules` stays `[]` → **all denied**, redirect to `/app/host-dashboard` | Fail closed. Host dashboard has no module gate, so the user always has a landing page           |
| API returns `modules: []`                                  | Same — all denied                                                                                  | An empty catalog means no grants                                                                |
| `hostUser.hostRoleId` missing/`0`                          | No load fires, `isLoaded: false`, `isHostSession: true` → all denied                               | Fail closed; `roleTypeGuard([0])` still lets them onto the host dashboard                       |
| Module name in a guard/menu key does not match the backend | Denied (host branch of `canAccessOrUnknown` fails closed)                                          | Loud and obvious in QA, unlike a silent fail-open                                               |
| Tenant (non-host) user                                     | Byte-identical to today                                                                            | The tenant branch of `loadFromStorage()` is unchanged apart from dropping the `isHostLogin(...) |     | ` term |

**Deliberate fail-closed choice:** unlike the tenant side, a host module absent from the response is denied. This is only safe because host role id `1` bypasses everything — if a key is wrong, the Super Admin can still reach Host Roles and fix the grant.

---

## Files touched

**Modified**

- `src/app/core/stores/current-user-permissions.store.ts` — host branch, `isHostSession`, `runHostLoad()`, `toHostPermissions()`, fail-closed `canAccessOrUnknown`
- `src/app/features/features.routes.ts` — module gates on 5 host routes; `canActivate: allStaff` on `setting`
- `src/app/features/host/roles/host-roles.routes.ts` — gate on `permissions/:hostRoleId`
- `src/app/features/host/modules/modules.routes.ts` — child gates (conditional on Step 0)
- `public/data/aside-menu.json` — `moduleKey` on 5 host management entries
- `src/app/layout/app-aside-menu/app-aside-menu.ts` — skip the shared `settings` section for hosts
- 8 host feature components (`.ts` + `.html`) — action gating per Step 5

**Not modified** (intentionally)

- `src/app/core/guards/has-module-permission-guard.ts` — reused as-is
- `src/app/core/services/host-api.ts` — `getHostRoleModulePermissions()` already exists; API services stay pure HTTP wrappers
- `src/app/features/authentication/login/login.ts` — already calls `loadFromStorage()`
- `src/app/layout/app-header/app-header.ts` — already calls `clear()` on logout
- `src/app/core/stores/auth.store.ts` — `hostUser`/`hostRole` already stored

---

## Verification

```bash
bun run build          # no type errors from the new store/guard wiring
bun run lint           # template a11y + eslint
bun run test           # existing specs must stay green
```

Existing specs that touch the changed lines and will need updating (out of the agreed scope, but they _will_ fail):
`src/app/core/stores/current-user-permissions.store.spec.ts:60,70` asserts `isSuperAdmin()` is `true` for a host login.

Manual matrix — create at least two host roles in the Host Roles screen (one with only Tenants `View`, one with nothing) and one host user per role, then for each:

1. **Menu** — sidebar shows only granted entries; no Settings section for any host.
2. **Direct URL** — type `/app/tenants`, `/app/host-users`, `/app/modules`, `/app/subscriptions`, `/app/host-roles`, `/app/setting`; each ungranted one toasts and redirects to `/app/host-dashboard`.
3. **Refresh** — hard-refresh (F5) while sitting on a granted host page; access must survive, and an ungranted URL entered on a cold tab must still be denied (race check).
4. **Actions** — on a `View`-only module, the Add button and the Edit/Delete row items are absent.
5. **Super Admin regression** — log in as `hostRoleId 1` and confirm every host screen and action is still reachable.
6. **Tenant regression** — log in as Admin (`roleTypeId 1`), Manager (`3`) and Employee (`2`) and confirm menu and routes are unchanged.
