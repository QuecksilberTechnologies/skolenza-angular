import { Routes } from '@angular/router';

import { InstitutionRoleTypeId } from '@shared/utilities/login-info';
import { hasModulePermissionGuard, roleTypeGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

const adminGuards = [
  roleTypeGuard([
    InstitutionRoleTypeId.InstitutionAdministrator,
    InstitutionRoleTypeId.StaffManager,
  ]),
  hasModulePermissionGuard('Leaves'),
];

export const LEAVES_ROUTES: Routes = [
  { path: '', redirectTo: 'my', pathMatch: 'full' },

  {
    path: 'my',
    loadComponent: () => import('./leave-management/leave-management'),
    title: `My Leave | ${titleSuffix}`,
  },
  {
    path: 'inbox',
    loadComponent: () => import('./leave-requests/leave-requests'),
    canActivate: adminGuards,
    title: `Approval Inbox | ${titleSuffix}`,
  },
  {
    path: 'history',
    loadComponent: () => import('./leave-history/leave-history'),
    canActivate: adminGuards,
    title: `Leave History | ${titleSuffix}`,
  },
  {
    path: 'types',
    loadComponent: () => import('./leave-requests/leave-types/leave-types'),
    canActivate: adminGuards,
    title: `Leave Types | ${titleSuffix}`,
  },
  {
    path: 'status',
    loadComponent: () => import('./leave-requests/leave-status/leave-status'),
    canActivate: adminGuards,
    title: `Leave Status | ${titleSuffix}`,
  },
  {
    path: 'balances',
    loadComponent: () =>
      import('./leave-requests/leave-balances/leave-balances'),
    canActivate: adminGuards,
    title: `Leave Balances | ${titleSuffix}`,
  },
  {
    path: 'rules',
    loadComponent: () => import('./leave-requests/leave-rules/leave-rules'),
    canActivate: adminGuards,
    title: `Leave Rules | ${titleSuffix}`,
  },

  // Legacy path redirects
  { path: 'leave-management', redirectTo: 'my', pathMatch: 'full' },
  { path: 'leave-requests', redirectTo: 'inbox', pathMatch: 'full' },
  { path: 'leave-types', redirectTo: 'types', pathMatch: 'full' },
  { path: 'leave-status', redirectTo: 'status', pathMatch: 'full' },
  { path: 'leave-balances', redirectTo: 'balances', pathMatch: 'full' },
  { path: 'leave-rules', redirectTo: 'rules', pathMatch: 'full' },
];
