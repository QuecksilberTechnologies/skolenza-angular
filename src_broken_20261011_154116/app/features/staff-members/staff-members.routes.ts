import { Routes } from '@angular/router';

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
const adminManager = [roleTypeGuard([1, 3])];

export const STAFF_MEMBERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./../staffMembers/staffMembers'),
    title: `StaffMembers | ${titleSuffix}`,
  },
  {
    path: 'permissions/:staffMemberId',
    loadComponent: () => import('./staffMembers-permissions/staffMembers-permissions'),
    title: `StaffMember Permissions | ${titleSuffix}`,
  },
  // The `EMP_*` siblings `GET /Navigation/my-menu` publishes under `STAFF_MGMT` as their own pages.
  // Reached from the side menu only; they are no longer tabs under `/app/profile`.
  ...[
    modulePlaceholderRoute('password-management', 'StaffMember Password Management', {
      label: 'Back to StaffMembers',
      url: '/app/staffMembers',
    }),
    {
      path: 'device-enrollment',
      loadComponent: () =>
        import('./../user-menu/staffMember-profile/staffMember-device-enrollment-info/staffMember-device-enrollment-info'),
      title: `StaffMember Device Enrollments | ${titleSuffix}`,
    },
    {
      path: 'work-locations',
      loadComponent: () =>
        import('./../user-menu/staffMember-profile/staffMember-location-assignment-info/staffMember-location-assignment-info'),
      title: `StaffMember Work Locations | ${titleSuffix}`,
    },
    {
      path: 'work-arrangements',
      loadComponent: () =>
        import('./../user-menu/staffMember-profile/staffMember-work-arrangement-info/staffMember-work-arrangement-info'),
      title: `StaffMember Work Arrangements | ${titleSuffix}`,
    },
    {
      path: 'work-patterns',
      loadComponent: () =>
        import('./../user-menu/staffMember-profile/staffMember-work-pattern-info/staffMember-work-pattern-info'),
      title: `StaffMember Work Patterns | ${titleSuffix}`,
    },
    {
      path: 'work-mode-overrides',
      loadComponent: () =>
        import('./../user-menu/staffMember-profile/staffMember-work-mode-override-info/staffMember-work-mode-override-info'),
      title: `StaffMember Work Mode Overrides | ${titleSuffix}`,
    },
  ].map((route) => ({ ...route, canActivate: adminManager })),
];

