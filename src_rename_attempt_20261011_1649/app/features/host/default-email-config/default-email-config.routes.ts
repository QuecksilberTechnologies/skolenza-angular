import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const DEFAULT_EMAIL_CONFIG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./default-email-config'),
  },
  {
    path: 'new',
    loadComponent: () => import('./default-email-config-form/default-email-config-form'),
    title: `Add Email Configuration | ${titleSuffix}`,
    // Module access alone would let a view-only host role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':configId/edit',
    loadComponent: () => import('./default-email-config-form/default-email-config-form'),
    title: `Edit Email Configuration | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];
