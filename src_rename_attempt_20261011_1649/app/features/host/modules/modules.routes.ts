import { Routes } from '@angular/router';

import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const MODULES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./parent-modules/parent-modules'),
    title: `Modules | ${titleSuffix}`,
  },
  {
    path: 'sub-modules',
    loadComponent: () => import('./sub-modules/sub-modules'),
    title: `Child Modules | ${titleSuffix}`,
  },
  {
    path: 'operations',
    loadComponent: () => import('./operations/operations'),
    title: `Operations | ${titleSuffix}`,
  },
  {
    path: 'module-operations',
    loadComponent: () => import('./module-operations/module-operations'),
    title: `Module Operations | ${titleSuffix}`,
  },
];
