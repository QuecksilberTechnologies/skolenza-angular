import { Routes } from '@angular/router';

import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const ASSETS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    loadComponent: () => import('./../assets-management/assets-management'),
    title: `Assets | ${titleSuffix}`,
  },
  {
    path: 'asset-status',
    loadComponent: () => import('./../assets-management/asset-status/asset-status'),
    title: 'Asset Status Management',
  },
  {
    path: 'asset-types',
    loadComponent: () => import('./../assets-management/asset-types/asset-types'),
    title: 'Asset Types Management',
  },
  {
    path: 'asset-categories',
    loadComponent: () => import('./../assets-management/asset-category/asset-category'),
    title: 'Asset Categories Management',
  },
];
