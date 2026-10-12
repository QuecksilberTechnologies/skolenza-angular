import { Routes } from '@angular/router';

import {
  HOST_ROLE_TYPE_ID,
  InstitutionRoleTypeId,
} from '@shared/utilities/login-info';
import {
  hasModulePermissionGuard,
  roleTypeGuard,
  roleTypeMatch,
} from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

// roleTypeId: 0=Host, 1=Admin, 2=StaffMember, 3=Manager, 4=External
const hostOnly = [roleTypeGuard([HOST_ROLE_TYPE_ID])];
const adminManager = [
  roleTypeGuard([
    InstitutionRoleTypeId.InstitutionAdministrator,
    InstitutionRoleTypeId.StaffManager,
  ]),
];
const adminManagerHost = [
  roleTypeGuard([
    HOST_ROLE_TYPE_ID,
    InstitutionRoleTypeId.InstitutionAdministrator,
    InstitutionRoleTypeId.StaffManager,
  ]),
]; // admin, manager, host (excludes staffMember)
const allStaff = [
  roleTypeGuard([
    InstitutionRoleTypeId.InstitutionAdministrator,
    InstitutionRoleTypeId.StaffMember,
    InstitutionRoleTypeId.StaffManager,
  ]),
]; // admin, manager, staffMember (excludes host)
const anyRole = [
  roleTypeGuard([
    HOST_ROLE_TYPE_ID,
    InstitutionRoleTypeId.InstitutionAdministrator,
    InstitutionRoleTypeId.StaffMember,
    InstitutionRoleTypeId.StaffManager,
  ]),
];
const staffMemberOnly = [roleTypeGuard([InstitutionRoleTypeId.StaffMember])];
// The persona dashboards. Role type 4 (External) has no other route access.
const adminOnly = [
  roleTypeGuard([InstitutionRoleTypeId.InstitutionAdministrator]),
];
const managerOnly = [roleTypeGuard([InstitutionRoleTypeId.StaffManager])];
const externalOnly = [roleTypeGuard([InstitutionRoleTypeId.ExternalUser])];

export const FEATURES_ROUTES: Routes = [
  {
    // Showcase for shared/components/form-inputs. Not linked from the menu.
    path: 'form-inputs-demo',
    loadComponent: () => import('./form-inputs-demo/form-inputs-demo'),
    title: `Form inputs | ${titleSuffix}`,
    canActivate: anyRole,
  },
  {
    path: 'host-dashboard',
    loadComponent: () => import('./dashboard/dashboard-host/dashboard-host'),
    title: `Dashboard | ${titleSuffix}`,
    canActivate: hostOnly,
  },
  {
    // One menu path, two dashboards: the manager's own comes first so `canMatch` claims it.
    path: 'admin-dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard-manager/dashboard-manager'),
    title: `Dashboard | ${titleSuffix}`,
    canMatch: [roleTypeMatch([InstitutionRoleTypeId.StaffManager])],
    canActivate: managerOnly,
  },
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./dashboard/dashboard-admin/dashboard-admin'),
    title: `Dashboard | ${titleSuffix}`,
    canActivate: adminOnly,
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard-external/dashboard-external'),
    title: `Dashboard | ${titleSuffix}`,
    canMatch: [roleTypeMatch([InstitutionRoleTypeId.ExternalUser])],
    canActivate: externalOnly,
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard-staff-member/dashboard'),
    title: `Dashboard | ${titleSuffix}`,
    canActivate: staffMemberOnly,
  },
  {
    path: 'staff',
    loadChildren: () =>
      import('./staff-members/staff-members.routes').then(
        (m) => m.STAFF_MEMBERS_ROUTES,
      ),
    title: `Staff | ${titleSuffix}`,
    canActivate: allStaff,
  },
  { path: 'staffMembers', redirectTo: 'staff' },
  {
    path: 'leave',
    loadChildren: () =>
      import('./leaves/leaves.routes').then((m) => m.LEAVES_ROUTES),
    title: `Leave | ${titleSuffix}`,
    canActivate: allStaff,
  },
  { path: 'leaves', redirectTo: 'leave' },
  {
    path: 'attendance',
    loadChildren: () =>
      import('./attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES),
    title: `Attendance | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'holidays',
    loadChildren: () =>
      import('./holidays/holiday.routes').then((m) => m.HOLIDAY_ROUTES),
    title: `Holidays | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'assets',
    loadChildren: () =>
      import('./assets-management/assets.routes').then((m) => m.ASSETS_ROUTES),
    title: `Assets | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'tickets',
    loadChildren: () =>
      import('./tickets/tickets.routes').then((m) => m.TICKETS_ROUTES),
    title: `Tickets | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'okr',
    loadChildren: () => import('./okr/okr.routes').then((m) => m.OKR_ROUTES),
    title: `OKR | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'tasks',
    loadChildren: () =>
      import('./tasks/tasks.routes').then((m) => m.TASKS_ROUTES),
    title: `Tasks | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'performance',
    loadChildren: () =>
      import('./performance-management/performance-management.routes').then(
        (m) => m.PERFORMANCE_MANAGEMENT_ROUTES,
      ),
    title: `Performance | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'learning',
    loadChildren: () =>
      import('./learning/learning.routes').then((m) => m.LEARNING_ROUTES),
    title: `Learning | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'projects',
    loadComponent: () => import('./projects/projects.component'),
    title: `Projects | ${titleSuffix}`,
    canActivate: allStaff,
  },
  {
    path: 'projects/:id',
    loadComponent: () =>
      import('./projects/project-views/project-views.component'),
    title: `Project Details | ${titleSuffix}`,
    loadChildren: () =>
      import('./projects/projects.routes').then((m) => m.PROJECTS_ROUTES),
    canActivate: allStaff,
  },
  // Host and staff share the `profile` path — `canMatch` picks the right page
  // and falls through silently when the role does not match.
  {
    path: 'profile',
    loadComponent: () => import('./user-menu/host-profile/host-profile'),
    title: `Profile | ${titleSuffix}`,
    canMatch: [roleTypeMatch([HOST_ROLE_TYPE_ID])],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./user-menu/staff-member-profile/staff-member-profile'),
    title: `Profile | ${titleSuffix}`,
    loadChildren: () =>
      import('./user-menu/staff-member-profile/staff-member-profile.routes').then(
        (m) => m.PROFILE_ROUTES,
      ),
    canActivate: allStaff,
  },
  {
    path: 'setting',
    loadComponent: () => import('./user-menu/settings/settings'),
    title: `Settings | ${titleSuffix}`,
    canActivate: anyRole,
    loadChildren: () =>
      import('./user-menu/settings/settings.routes').then(
        (m) => m.SETTINGS_ROUTES,
      ),
  },
  {
    path: 'help-support',
    loadComponent: () => import('./user-menu/help-support/help-support'),
    title: `Help & Support | ${titleSuffix}`,
    canActivate: anyRole,
  },
  {
    path: 'staff-member-monitoring',
    loadComponent: () =>
      import('./staff-member-monitoring/staff-member-monitoring'),
    title: `Staff Member Monitoring | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications'),
    title: `Notifications | ${titleSuffix}`,
  },
  {
    path: 'update-password',
    loadComponent: () => import('./user-menu/update-password/update-password'),
    title: `Update Password | ${titleSuffix}`,
    canActivate: anyRole,
  },
  // Admin
  {
    path: 'roles',
    loadChildren: () =>
      import('./roles/roles.routes').then((m) => m.ROLES_ROUTES),
    title: `Roles | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'departments',
    loadComponent: () => import('./departments/departments'),
    title: `Departments | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'campuses',
    redirectTo: 'campuses',
  },
  {
    path: 'campuses',
    loadChildren: () =>
      import('./campuses/campuses.routes').then(
        (m) => m.INSTITUTION_CAMPUSES_ROUTES,
      ),
    title: `Campuses | ${titleSuffix}`,
    // A host session reaches this route under its own read-only sidebar leaf,
    // `HOST_CAMPUS_LIST` (see aside-menu-module-map.ts) — the roleType gate must admit it.
    canActivate: adminManagerHost,
  },
  {
    // Distinct from the Host-only `/app/institution-devices` inventory list below - this is the Institution's
    // own runtime-settings screen for its assigned devices; Host principals are denied its backend
    // routes (see `docs/specs/InstitutionDeviceRuntimeSettingsUiHandoff.md`).
    path: 'my-devices',
    loadChildren: () =>
      import('./institution-devices/institution-devices.routes').then(
        (m) => m.INSTITUTION_DEVICES_ROUTES,
      ),
    title: `My Devices | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'institution-email-config',
    loadChildren: () =>
      import('./institution-email-config/institution-email-config.routes').then(
        (m) => m.INSTITUTION_EMAIL_CONFIG_ROUTES,
      ),
    title: `Email Configuration | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    // The Host template screens under a institution scope - see `INSTITUTION_EMAIL_TEMPLATES_ROUTES`.
    path: 'institution-email-templates',
    loadChildren: () =>
      import('./host/email-templates/email-templates.routes').then(
        (m) => m.INSTITUTION_EMAIL_TEMPLATES_ROUTES,
      ),
    title: `Email Templates | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    // Attendance policies now live under the Policies hub; keep old links working.
    path: 'attendance-policies',
    redirectTo: 'policies/attendance-policies',
  },
  {
    path: 'designations',
    loadComponent: () => import('./designations/designations'),
    title: `Designations | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    // `INSTITUTION_PROFILE` and `INSTITUTION_AUDIT_LOGS`. `INSTITUTION_SETTINGS` and `INSTITUTION_SUBSCRIPTION` are the
    // two siblings that already have screens, at `setting` and `setting/billing`.
    path: 'institution',
    loadChildren: () =>
      import('./institution/institution.routes').then(
        (m) => m.INSTITUTION_ROUTES,
      ),
    title: `Institution | ${titleSuffix}`,
    canActivate: adminManager,
  },
  { path: 'institution', redirectTo: 'institution' },
  {
    path: 'staff-member-code-configuration',
    loadComponent: () =>
      import('./staff-member-code-configuration/staff-member-code-configuration'),
    title: `Staff Member Code Configuration | ${titleSuffix}`,
    data: { pageTitle: 'Staff Member Code Configuration' },
    canActivate: adminManager,
  },
  {
    path: 'staff-employment-types',
    loadComponent: () =>
      import('./staff-employment-types/staff-employment-types'),
    title: `Staff Employment Types | ${titleSuffix}`,
    canActivate: adminManager,
  },
  { path: 'staff-employment-types', redirectTo: 'staff-employment-types' },
  {
    // `INSTITUTION_DEVICE_CONFIGURATION` now redirects here instead of a stub: `my-devices` (this same
    // path, see the `my-devices` route below, which carries its own `canActivate`) is where the
    // Institution admin picks a device and, from its settings page, creates/edits/deletes that device's
    // own connection - see `aside-menu-module-map.ts` for the sidebar leaf. `canActivate` is
    // deliberately omitted here: combined with `redirectTo`, Angular's router fails to load this
    // entire lazy route table, which silently breaks navigation for every `/app/*` route including
    // the post-login dashboard redirect.
    path: 'device-connectivity',
    redirectTo: 'my-devices',
  },
  {
    path: 'bulk-upload',
    loadChildren: () =>
      import('./bulk-upload/bulk-upload.routes').then(
        (m) => m.BULK_UPLOAD_ROUTES,
      ),
    title: `Bulk Upload | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'report-types',
    loadComponent: () => import('./report-type/report-type'),
    title: `Report Types | ${titleSuffix}`,
    canActivate: adminManager,
  },
  // Platform Administrator. Legacy Host URLs remain as redirects while saved menus migrate.
  {
    path: 'platform-users',
    loadComponent: () => import('./host/users/host-users'),
    title: `Platform Users | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.hostUser)],
  },
  {
    path: 'platform-roles',
    loadChildren: () =>
      import('./host/roles/host-roles.routes').then((m) => m.HOST_ROLES_ROUTES),
    title: `Platform Roles | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.hostRole)],
  },
  {
    path: 'host-users',
    redirectTo: 'platform-users',
  },
  {
    path: 'host-roles',
    redirectTo: 'platform-roles',
  },
  // Institutions and Modules management have no dedicated host module, so they fall back
  // to the parent `Host` umbrella key until the backend adds their own.
  {
    path: 'institutions',
    redirectTo: 'institutions',
  },
  {
    path: 'institutions',
    loadChildren: () =>
      import('./host/institutions/institutions.routes').then(
        (m) => m.INSTITUTIONS_ROUTES,
      ),
    title: `Institutions | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.host)],
  },
  {
    path: 'subscriptions',
    loadComponent: () => import('./host/subscriptions/subscriptions'),
    title: `Plans | ${titleSuffix}`,
    canActivate: [
      ...hostOnly,
      hasModulePermissionGuard(HOST_MODULE.subscriptionPlan),
    ],
  },
  // The seven `HOST_BILLING_*` leaves. Not in the `get-host-modules` catalog, so there is no
  // `HOST_MODULE` key to guard on — each screen gates its actions on its own `moduleCode`.
  {
    path: 'billing',
    loadChildren: () =>
      import('./host/billing/billing.routes').then((m) => m.BILLING_ROUTES),
    canActivate: [...hostOnly],
  },
  {
    path: 'modules',
    loadChildren: () =>
      import('./host/modules/modules.routes').then((m) => m.MODULES_ROUTES),
    title: `Modules | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.host)],
  },
  {
    path: 'device-masters',
    loadChildren: () =>
      import('./host/device-masters/device-masters.routes').then(
        (m) => m.DEVICE_MASTERS_ROUTES,
      ),
    title: `Device Masters | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.host)],
  },
  // The path is the one `GET /Navigation/my-menu` publishes as `urlPath` for
  // `HOST_DEFAULT_EMAIL_CONFIG`, so the sidebar link and the route agree.
  {
    path: 'default-email-config',
    loadChildren: () =>
      import('./host/default-email-config/default-email-config.routes').then(
        (m) => m.DEFAULT_EMAIL_CONFIG_ROUTES,
      ),
    title: `Default Email Configuration | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.host)],
  },
  {
    path: 'email-templates',
    loadChildren: () =>
      import('./host/email-templates/email-templates.routes').then(
        (m) => m.EMAIL_TEMPLATES_ROUTES,
      ),
    title: `Email Templates | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.host)],
  },
  {
    path: 'institution-devices',
    redirectTo: 'institution-devices',
  },
  {
    path: 'institution-devices',
    loadChildren: () =>
      import('./host/institution-devices/institution-devices.routes').then(
        (m) => m.INSTITUTION_DEVICES_ROUTES,
      ),
    title: `Institution Devices | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.host)],
  },
  {
    path: 'institution-device-configurations',
    redirectTo: 'institution-device-configurations',
  },
  {
    path: 'institution-device-configurations',
    loadChildren: () =>
      import('./host/institution-device-configurations/institution-device-configurations.routes').then(
        (m) => m.INSTITUTION_DEVICE_CONFIGURATIONS_ROUTES,
      ),
    title: `Device Configurations | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.host)],
  },
  {
    path: 'institution-card-inventory',
    redirectTo: 'institution-card-inventory',
  },
  {
    path: 'institution-card-inventory',
    loadChildren: () =>
      import('./host/institution-card-inventory/institution-card-inventory.routes').then(
        (m) => m.INSTITUTION_CARD_INVENTORY_ROUTES,
      ),
    title: `Card Inventory | ${titleSuffix}`,
    canActivate: [...hostOnly, hasModulePermissionGuard(HOST_MODULE.host)],
  },
  {
    path: 'policies',
    loadChildren: () =>
      import('./policies/policies.routes').then((m) => m.POLICIES_ROUTES),
    title: `Policies | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    // The compliance/document policy engine (docs/specs/INSTITUTION_POLICY/). Its own prefix rather than
    // nesting under `policies` above, which already owns that path for the unrelated
    // leave/insurance policy-types feature.
    path: 'institution-policies',
    loadChildren: () =>
      import('./institution-policies/institution-policies.routes').then(
        (m) => m.INSTITUTION_POLICIES_ROUTES,
      ),
    title: `Institution Policies | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'payroll',
    loadChildren: () =>
      import('./payroll/payroll.routes').then((m) => m.PAYROLL_ROUTES),
    title: `Payroll | ${titleSuffix}`,
    canActivate: allStaff,
  },
  // Error pages
  {
    // Left ungated on purpose: the parent `/app` route already runs isAuthenticatedGuard, and any
    // further gate here would bounce a denied user back into a redirect loop.
    path: 'access-denied',
    loadComponent: () => import('./access-denied/access-denied'),
    title: `Access denied | ${titleSuffix}`,
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found'),
  },
];
