import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const INSTITUTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./institutions'),
  },
  {
    path: 'new',
    loadComponent: () => import('./institution-form/institution-form'),
    title: `Create Institution | ${titleSuffix}`,
    // Module access alone would let a view-only host role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':institutionId/edit',
    loadComponent: () => import('./institution-form/institution-form'),
    title: `Edit Institution | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':institutionId/modules',
    loadComponent: () => import('./institution-modules/institution-modules'),
    title: `Institution Modules | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];
