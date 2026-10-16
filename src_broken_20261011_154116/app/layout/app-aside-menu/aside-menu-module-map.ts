export interface AsideMenuModuleUi {
  /**
   * Route relative to the `/app` shell — no leading slash, no `app/` prefix. Absent on a node
   * that only groups children.
   *
   * This is deliberately NOT the API's `urlPath`: the backend says `/locations` where the app
   * routes `institution-locations`, `/host/institutions` where the app routes `institutions`, and several of
   * its paths have no route at all.
   */
  route?: string;
  /**
   * PrimeIcons class. The API's `iconKey` is a Bootstrap Icons class (`bi bi-*`), which this app
   * does not load.
   */
  icon: string;
  /**
   * Overrides the node's `displayName` in the sidebar. Only for a leaf whose API name reads as a
   * position inside its parent rather than as a menu row - the two `*_DASHBOARD_OVERVIEW` codes,
   * whose "Overview" is the only mapped child of a "Dashboard" group, so the group collapses onto
   * it and the word "Dashboard" would otherwise leave the menu entirely (and the alphabetical sort
   * would file the row under O).
   */
  label?: string;
}

/** Keyed by `FeaturePageNode.moduleCode`. A code absent from this map is not rendered. */
export const ASIDE_MENU_MODULE_UI: Readonly<Record<string, AsideMenuModuleUi>> = {
  // Institution scope
  STAFF_MGMT: { icon: 'pi pi-users' },
  STAFF_DIRECTORY: { route: 'staff', icon: 'pi pi-users' },
  EMP_PASSWORD_MANAGEMENT: { route: 'staff/password-management', icon: 'pi pi-key' },
  STAFF_DEVICE_ENROLMENTS: { route: 'staff/device-enrollment', icon: 'pi pi-mobile' },
  STAFF_CAMPUS_ASSIGNMENTS: { route: 'staff/work-locations', icon: 'pi pi-map' },
  // Not yet published by `my-menu`; the row appears once the backend adds the module code.
  EMP_MONITORING: { route: 'staffMember-monitoring', icon: 'pi pi-desktop' },
  STAFF_WORK_ARRANGEMENTS: { route: 'staff/work-arrangements', icon: 'pi pi-calendar' },
  STAFF_WORK_PATTERNS: { route: 'staff/work-patterns', icon: 'pi pi-calendar-minus' },
  STAFF_WORK_MODE_OVERRIDES: { route: 'staff/work-mode-overrides', icon: 'pi pi-calendar-times' },
  INSTITUTION_MGMT: { icon: 'pi pi-building' },
  INSTITUTION_PROFILE: { route: 'institution/profile', icon: 'pi pi-building-columns' },
  INSTITUTION_AUDIT_LOGS: { route: 'institution/audit-logs', icon: 'pi pi-history' },
  // `my-menu` renamed these four leaves and nested them under a new parent group (read live
  // 2026-09-15: DEPARTMENT/DESIGNATION/ROLE/STAFF_EMPLOYMENT_TYPES, same module ids as the codes below).
  // The old codes stay mapped too in case a session is still served the pre-rename shape.
  INSTITUTION_DEPARTMENTS: { route: 'departments', icon: 'pi pi-sitemap' },
  INSTITUTION_STAFF_DESIGNATIONS: { route: 'designations', icon: 'pi pi-id-card' },
  INSTITUTION_STAFF_CODE: { route: 'staffMember-code-configuration', icon: 'pi pi-hashtag' },
  STAFF_EMPLOYMENT_TYPES: { route: 'staff-employment-types', icon: 'pi pi-tags' },
  INSTITUTION_CAMPUSES: { route: 'campuses', icon: 'pi pi-map-marker' },
  INSTITUTION_REPORTING_TYPES: { route: 'report-types', icon: 'pi pi-chart-bar' },
  INSTITUTION_ACCESS: { route: 'roles', icon: 'pi pi-shield' },
  INSTITUTION_EMAIL_CONFIG: { route: 'institution-email-config', icon: 'pi pi-envelope' },
  // Read live 2026-09-25: a child of `INSTITUTION_EMAIL_CONFIG` (module id 119).
  INSTITUTION_EMAIL_TEMPLATE: { route: 'institution-email-templates', icon: 'pi pi-file-edit' },
  INSTITUTION_ATTENDANCE_POLICIES: { route: 'policies/attendance-policies', icon: 'pi pi-clock' },
  // The app already has these two screens under the Settings shell, so the leaf links there rather
  // than at the `/institution/settings` and `/institution/subscription` paths the API publishes.
  INSTITUTION_SETTINGS: { route: 'setting', icon: 'pi pi-cog' },
  INSTITUTION_SUBSCRIPTION: { route: 'setting/billing', icon: 'pi pi-credit-card' },
  // The institution's own device list. `my-menu` publishes `/app/institution-devices` for it, but that route
  // is the Host inventory screen and is `hostOnly`; the institution twin is `my-devices`
  // (`features.routes.ts`).
  INSTITUTION_DEVICE_SETUP: { route: 'my-devices', icon: 'pi pi-desktop' },
  // `INSTITUTION_DEVICE_CONFIGURATION` is deliberately not a leaf of its own - see
  // `aside-menu-unmapped-modules.ts`.
  // The rename's new leaves and their parent groups (see the comment above `INSTITUTION_DEPARTMENTS`).
  INSTITUTION_DASHBOARD: { icon: 'pi pi-gauge' },
  INSTITUTION_DASHBOARD_OVERVIEW: { route: 'admin-dashboard', icon: 'pi pi-gauge', label: 'Dashboard' },
  INSTITUTION_DEPARTMENT: { icon: 'pi pi-sitemap' },
  DEPARTMENT: { route: 'departments', icon: 'pi pi-sitemap' },
  INSTITUTION_DESIGNATION: { icon: 'pi pi-id-card' },
  DESIGNATION: { route: 'designations', icon: 'pi pi-id-card' },
  INSTITUTION_ROLE: { icon: 'pi pi-shield' },
  ROLE: { route: 'roles', icon: 'pi pi-shield' },
  BULKUPLOAD: { icon: 'pi pi-upload' },
  BULK_STAFF_MEMBERS: { route: 'bulk-upload/staffMembers', icon: 'pi pi-users' },
  BULK_DEPARTMENTS: { route: 'bulk-upload/departments', icon: 'pi pi-sitemap' },
  BULK_DESIGNATIONS: { route: 'bulk-upload/designations', icon: 'pi pi-id-card' },
  BULK_ROLES: { route: 'bulk-upload/roles', icon: 'pi pi-shield' },
  BULK_STAFF_EMPLOYMENT_TYPES: { route: 'bulk-upload/staff-employment-types', icon: 'pi pi-tags' },
  // The Institution Policy tree (docs/specs/INSTITUTION_POLICY/). Policy Types and Policy Definitions ship
  // so far; the remaining siblings stay in `aside-menu-unmapped-modules.ts` until their screens exist.
  INSTITUTION_POLICIES: { icon: 'pi pi-book' },
  INSTITUTION_POLICY_DEFINITIONS: { route: 'institution-policies', icon: 'pi pi-file-edit' },
  INSTITUTION_POLICY_TYPES: { route: 'institution-policies/types', icon: 'pi pi-tags' },
  INSTITUTION_POLICY_APPROVALS: { route: 'institution-policies/approval-stages', icon: 'pi pi-sitemap' },
  // Read live 2026-09-22: `my-menu` publishes `/app/holidays` under the policy tree; the app's
  // existing `holidays` screen is that page. Renamed from `INSTITUTION_POLICY_HOLIDAY_CALENDAR` (read
  // live 2026-09-23).
  INSTITUTION_POLICY_HOLIDAY: { route: 'holidays', icon: 'pi pi-calendar' },

  // Host scope
  // Read live 2026-09-16: the host twin of `INSTITUTION_DASHBOARD`/`INSTITUTION_DASHBOARD_OVERVIEW` above.
  HOST_DASHBOARD: { icon: 'pi pi-gauge' },
  HOST_DASHBOARD_OVERVIEW: { route: 'host-dashboard', icon: 'pi pi-gauge', label: 'Dashboard' },
  HOST_INSTITUTION_MGMT: { icon: 'pi pi-building' },
  HOST_INSTITUTION_LIST: { route: 'institutions', icon: 'pi pi-building' },
  // The institution payload now publishes these two screens as `INSTITUTION_DEVICE_SETUP` and
  // `INSTITUTION_DEVICE_CONFIGURATION` (see the institution block above). Both spellings stay mapped: the
  // captured payload behind the rename is institution-scope only, so whether a host session still
  // receives the older codes is unverified, and a stale code that renders beats a menu that loses
  // two leaves.
  INSTITUTION_DEVICES: { route: 'institution-devices', icon: 'pi pi-sitemap' },
  INSTITUTION_DEVICE_CONFIG: { route: 'institution-device-configurations', icon: 'pi pi-cog' },
  // Host's own leaf onto the same `institution-locations` route the institution scope's `INSTITUTION_CAMPUSES`
  // uses — a different `moduleCode` because `my-menu` grants a host session `View` only, never
  // `Add`/`Update`/`Delete`. Confirmed against a live `/Navigation/my-menu` row (`moduleId: 78`,
  // `moduleCode: HOST_CAMPUS_LIST`). `iconKey` on this leaf is `bi bi-geo-alt`, a
  // Bootstrap Icons class; this map is PrimeIcons, so the icon is named here instead.
  HOST_CAMPUS_LIST: { route: 'campuses', icon: 'pi pi-map-marker' },
  HOST_DEVICE_MGMT: { icon: 'pi pi-tablet' },
  // `/app/device-masters` is the `urlPath` this code publishes, and `DeviceMaster` is the global
  // device catalog. Its sibling `HOST_DEVICE_INVENTORY` is a different, unbuilt screen — see below.
  HOST_DEVICE_SETUP: { route: 'device-masters', icon: 'pi pi-tablet' },
  // `iconKey` on this leaf is `bi bi-envelope-gear`, a Bootstrap Icons class. This map is
  // PrimeIcons, so the icon is named here rather than taken from the API.
  HOST_DEFAULT_EMAIL_CONFIG: { route: 'default-email-config', icon: 'pi pi-envelope' },
  HOST_EMAIL_TEMPLATE: { route: 'email-templates', icon: 'pi pi-file-edit' },

  // Host management
  HOST_MANAGEMENT: { icon: 'pi pi-shield' },
  HOST_USERS: { route: 'host-users', icon: 'pi pi-users' },
  HOST_ROLES: { route: 'host-roles', icon: 'pi pi-shield' },
  HOST_MODULES: { route: 'modules', icon: 'pi pi-table' },
  HOST_SUBMODULES: { route: 'modules/sub-modules', icon: 'pi pi-sitemap' },
  HOST_OPERATIONS: { route: 'modules/operations', icon: 'pi pi-bolt' },
  HOST_MODULE_OPERATIONS: { route: 'modules/module-operations', icon: 'pi pi-link' },
  HOST_SUBSCRIPTIONS: { route: 'subscriptions', icon: 'pi pi-credit-card' },
  // Children of `HOST_SUBSCRIPTIONS`. Each `iconKey` is a Bootstrap Icons class (`bi bi-tags`, …);
  // this map is PrimeIcons, so the icons are named here.
  HOST_BILLING_CONFIGURATION: { route: 'billing/configuration', icon: 'pi pi-cog' },
  HOST_BILLING_PLAN_PRICES: { route: 'billing/plan-prices', icon: 'pi pi-tags' },
  HOST_BILLING_TAX_RULES: { route: 'billing/tax-rules', icon: 'pi pi-percentage' },
  HOST_BILLING_TRANSACTIONS: { route: 'billing/transactions', icon: 'pi pi-receipt' },
  HOST_BILLING_REFUNDS: { route: 'billing/refunds', icon: 'pi pi-replay' },
  HOST_BILLING_RECONCILIATION: { route: 'billing/reconciliation', icon: 'pi pi-sync' },
  HOST_BILLING_AUDIT: { route: 'billing/audit', icon: 'pi pi-history' },
  HOST_INSTITUTION_RFID_MANAGEMENT: { icon: 'pi pi-wifi' },
  HOST_INSTITUTION_CARD_INVENTORY: { route: 'institution-card-inventory', icon: 'pi pi-id-card' },

  // Codes `my-menu` publishes that are deliberately absent from this table live in
  // `aside-menu-unmapped-modules.ts`, one entry per code with its reason.
};

/** The common-menu subtree lives in the header user menu, not the sidebar. */
export const COMMON_MENU_MODULE_CODE = 'COMMON_MENU';


