import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const DEVICE_MASTERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./device-masters'),
  },
  {
    path: 'new',
    loadComponent: () => import('./device-master-form/device-master-form'),
    title: `Add Device | ${titleSuffix}`,
    // Module access alone would let a view-only host role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':deviceMasterId/edit',
    loadComponent: () => import('./device-master-form/device-master-form'),
    title: `Edit Device | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];
