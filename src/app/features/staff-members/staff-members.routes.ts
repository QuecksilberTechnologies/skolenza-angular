import { Routes } from '@angular/router';

import { InstitutionRoleTypeId } from '@shared/utilities/login-info';
import { roleTypeGuard } from '@core/guards';
import { environment } from '@env/environment';
import { modulePlaceholderRoute } from '@shared/components/module-placeholder/module-placeholder-route';

const titleSuffix = environment.appName;

/**
 * roleTypeId 1=Admin, 3=Manager.
 *
 * The parent `staffMembers` route admits StaffMember (2) as well, because the directory is
 * self-service. The pages below are not: they administer other people's credentials, devices and
 * work schedules, which is the same reach as `/app/institution/*` and `/app/bulk-upload/*` and takes the
 * same gate.
 */
const adminManager = [
  roleTypeGuard([
    InstitutionRoleTypeId.InstitutionAdministrator,
    InstitutionRoleTypeId.StaffManager,
  ]),
];

export const STAFF_MEMBERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./../staff-members/staff-members'),
    title: `StaffMembers | ${titleSuffix}`,
  },
  {
    path: 'new',
    loadComponent: () =>
      import('@shared/components/staff-member/staff-member-manage-dialog/staff-member-manage-dialog').then(
        (module) => module.StaffMemberManageDialog,
      ),
    title: `Add Staff Member | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'professional-structure',
    loadComponent: () =>
      import('./staff-professional-structure/staff-professional-structure'),
    title: `Staff Professional Structure | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'academic-structure',
    loadComponent: () => import('./staff-academic-structure/staff-academic-structure'),
    title: `Academic Structure | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: ':staffMemberId/academic-assignments',
    loadComponent: () => import('./staff-academic-structure/staff-academic-structure'),
    title: `Staff Academic Assignments | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: ':staffMemberId/edit',
    loadComponent: () =>
      import('@shared/components/staff-member/staff-member-manage-dialog/staff-member-manage-dialog').then(
        (module) => module.StaffMemberManageDialog,
      ),
    title: `Edit Staff Member | ${titleSuffix}`,
    canActivate: adminManager,
  },
  {
    path: 'permissions/:staff-memberId',
    loadComponent: () =>
      import('./staff-members-permissions/staff-members-permissions'),
    title: `StaffMember Permissions | ${titleSuffix}`,
  },
  // The `EMP_*` siblings `GET /Navigation/my-menu` publishes under `STAFF_MGMT` as their own pages.
  // Reached from the side menu only; they are no longer tabs under `/app/profile`.
  ...[
    modulePlaceholderRoute(
      'password-management',
      'StaffMember Password Management',
      {
        label: 'Back to StaffMembers',
        url: '/app/staff-members',
      },
    ),
    {
      path: 'device-enrollment',
      loadComponent: () =>
        import('./../user-menu/staff-member-profile/staff-member-device-enrollment-info/staff-member-device-enrollment-info'),
      title: `StaffMember Device Enrollments | ${titleSuffix}`,
    },
    {
      path: 'work-locations',
      loadComponent: () =>
        import('./../user-menu/staff-member-profile/staff-member-location-assignment-info/staff-member-location-assignment-info'),
      title: `StaffMember Work Locations | ${titleSuffix}`,
    },
    {
      path: 'work-arrangements',
      loadComponent: () =>
        import('./../user-menu/staff-member-profile/staff-member-work-arrangement-info/staff-member-work-arrangement-info'),
      title: `StaffMember Work Arrangements | ${titleSuffix}`,
    },
    {
      path: 'work-patterns',
      loadComponent: () =>
        import('./../user-menu/staff-member-profile/staff-member-work-pattern-info/staff-member-work-pattern-info'),
      title: `StaffMember Work Patterns | ${titleSuffix}`,
    },
    {
      path: 'work-mode-overrides',
      loadComponent: () =>
        import('./../user-menu/staff-member-profile/staff-member-work-mode-override-info/staff-member-work-mode-override-info'),
      title: `StaffMember Work Mode Overrides | ${titleSuffix}`,
    },
  ].map((route) => ({ ...route, canActivate: adminManager })),
];
