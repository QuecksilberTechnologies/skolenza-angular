import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const INSTITUTION_DEVICES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./institution-devices'),
  },
  {
    path: 'new',
    loadComponent: () => import('./institution-device-form/institution-device-form'),
    title: `Add Institution Device | ${titleSuffix}`,
    // Module access alone would let a view-only host role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':institutionDeviceId/edit',
    loadComponent: () => import('./institution-device-form/institution-device-form'),
    title: `Edit Institution Device | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];
