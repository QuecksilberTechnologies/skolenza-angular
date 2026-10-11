import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const INSTITUTION_CARD_INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./institution-card-inventory'),
  },
  {
    path: 'new',
    loadComponent: () => import('./institution-card-inventory-form/institution-card-inventory-form'),
    title: `Add Card | ${titleSuffix}`,
    // Module access alone would let a view-only host role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':cardId/edit',
    loadComponent: () => import('./institution-card-inventory-form/institution-card-inventory-form'),
    title: `Edit Card | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];
