import { Routes } from '@angular/router';

import { roleTypeGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

// roleTypeId: 0=Host, 1=Admin, 2=StaffMember, 3=Manager
const adminManager = [roleTypeGuard([1, 3])];

export const OKR_ROUTES: Routes = [
  { path: '', redirectTo: 'my', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./okr-dashboard/okr-dashboard'),
    title: `OKR Dashboard | ${titleSuffix}`,
  },
  {
    path: 'my',
    loadComponent: () => import('./okr-list/okr-list'),
    title: `My OKRs | ${titleSuffix}`,
    data: { scope: 'my' },
  },
  {
    path: 'team',
    loadComponent: () => import('./okr-list/okr-list'),
    title: `Team OKRs | ${titleSuffix}`,
    data: { scope: 'team' },
    canActivate: adminManager,
  },
  {
    path: 'company',
    loadComponent: () => import('./okr-list/okr-list'),
    title: `Company OKRs | ${titleSuffix}`,
    data: { scope: 'company' },
  },
  {
    path: 'create',
    loadComponent: () => import('./okr-form/okr-form'),
    title: `Create OKR | ${titleSuffix}`,
    data: { mode: 'create' },
    canActivate: adminManager,
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./okr-form/okr-form'),
    title: `Edit OKR | ${titleSuffix}`,
    data: { mode: 'edit' },
    canActivate: adminManager,
  },
  {
    path: ':id',
    loadComponent: () => import('./okr-detail/okr-detail'),
    title: `OKR Details | ${titleSuffix}`,
  },
];
