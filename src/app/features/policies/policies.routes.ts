import { Routes } from '@angular/router';

import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const POLICIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./policy-types/policy-types'),
    title: `Policies | ${titleSuffix}`,
  },
  {
    path: 'attendance-policies',
    loadChildren: () =>
      import('../attendance-policies/attendance-policies.routes').then(
        (m) => m.ATTENDANCE_POLICIES_ROUTES,
      ),
    title: `Attendance Policies | ${titleSuffix}`,
  },
  {
    path: 'insurance-policies',
    loadComponent: () => import('./policies-insurance/policies-insurance'),
    title: `Insurance Policies | ${titleSuffix}`,
  },
  {
    path: 'insurance-policy-type-mapping',
    loadComponent: () => import('./policy-type-insurance-map/policy-type-insurance-map'),
    title: `Insurance - Policy Type Mapping | ${titleSuffix}`,
  },
  {
    path: 'leave-policy-type-mapping',
    loadComponent: () => import('./policy-mapping-leave-type/policy-mapping-leave-type'),
    title: `Policy Type Insurance Map | ${titleSuffix}`,
  },
  {
    path: 'leave-staff-member-policy-mapping',
    loadComponent: () => import('./leave-staff-member-policy-map/leave-staff-member-policy-map'),
    title: `Leave - Staff Member Policy Mapping | ${titleSuffix}`,
  },
  // Pre-rename path, kept so old bookmarks and links still resolve.
  { path: 'leave-staffMember-policy-mapping', redirectTo: 'leave-staff-member-policy-mapping' },
];
