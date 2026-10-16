import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

/**
 * Attendance configuration has no catalog module of its own yet, so these screens ride the existing
 * institution `Attendance` key. Swap it once the backend models locations separately.
 */
const MODULE_KEY = 'Attendance';

export const INSTITUTION_CAMPUSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./institution-locations'),
  },
  {
    path: 'new',
    loadComponent: () => import('./institution-location-form/institution-location-form'),
    title: `Add Location | ${titleSuffix}`,
    // Module access alone would let a view-only role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(MODULE_KEY, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':institutionLocationId/edit',
    loadComponent: () => import('./institution-location-form/institution-location-form'),
    title: `Edit Location | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(MODULE_KEY, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];

