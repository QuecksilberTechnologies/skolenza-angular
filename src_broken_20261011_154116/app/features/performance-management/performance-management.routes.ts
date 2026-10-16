import { Routes } from '@angular/router';

import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const PERFORMANCE_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pms-shell/pms-shell'),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pms-dashboard/pms-dashboard'),
        title: `Performance Dashboard | ${titleSuffix}`,
      },
      {
        path: 'goals',
        loadComponent: () => import('./pms-goals/pms-goals'),
        title: `Goals | ${titleSuffix}`,
      },
      {
        path: 'reviews',
        loadComponent: () => import('./pms-reviews/pms-reviews'),
        title: `Reviews | ${titleSuffix}`,
      },
      {
        path: 'feedback',
        loadComponent: () => import('./pms-feedback/pms-feedback'),
        title: `Feedback | ${titleSuffix}`,
      },
      {
        path: 'one-on-one',
        loadComponent: () => import('./pms-one-on-one/pms-one-on-one'),
        title: `One-on-One | ${titleSuffix}`,
      },
      {
        path: 'history',
        loadComponent: () => import('./pms-history/pms-history'),
        title: `Performance History | ${titleSuffix}`,
      },
    ],
  },
];
