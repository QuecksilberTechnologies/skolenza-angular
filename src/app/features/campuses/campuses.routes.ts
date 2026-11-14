import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

const MODULE_KEY = 'Campuses';

export const INSTITUTION_CAMPUSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./campuses'),
  },
  {
    path: 'new',
    loadComponent: () => import('./campus-form/campus-form'),
    title: `Add Location | ${titleSuffix}`,
    // Module access alone would let a view-only role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(MODULE_KEY, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':campusId/edit',
    loadComponent: () => import('./campus-form/campus-form'),
    title: `Edit Location | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(MODULE_KEY, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];
