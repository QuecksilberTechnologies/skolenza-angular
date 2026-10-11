import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { roleTypeGuard, superAdminGuard } from '@core/guards';
import { CurrentUserPermissionsStore } from '@core/stores';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

// roleTypeId: 1=Admin, 3=Manager
const adminManager = [roleTypeGuard([1, 3])];

// Org-wide settings — everyone else is bounced to the one tab they can use.
const superAdminOnly = [superAdminGuard('/app/setting/appearance')];

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: () =>
      inject(CurrentUserPermissionsStore).isSuperAdmin() ? 'brand-identity' : 'appearance',
    pathMatch: 'full',
  },
  {
    path: 'brand-identity',
    loadComponent: () => import('./brand-identity/brand-identity'),
    title: `Brand Identity | ${titleSuffix}`,
    canActivate: superAdminOnly,
  },
  {
    path: 'appearance',
    loadComponent: () => import('./appearance/appearance'),
    title: `Appearance | ${titleSuffix}`,
  },
  {
    path: 'language-region',
    loadComponent: () => import('./language-region/language-region'),
    title: `Language & Region | ${titleSuffix}`,
    canActivate: superAdminOnly,
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications-settings/notifications-settings'),
    title: `Notifications | ${titleSuffix}`,
    canActivate: superAdminOnly,
  },
  {
    path: 'staffMember-editing',
    loadComponent: () => import('./staff-member-editing/staff-member-editing'),
    title: `StaffMember Editing | ${titleSuffix}`,
    canActivate: superAdminOnly,
  },
  {
    path: 'billing',
    loadComponent: () => import('../../subscription/subscription'),
    title: `Billing & Subscription | ${titleSuffix}`,
    canActivate: adminManager,
  },
];
