import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

/**
 * Attendance configuration has no catalog module of its own yet, so these screens ride the existing
 * institution `Attendance` key. Swap it once the backend models attendance policies separately.
 */
const MODULE_KEY = 'Attendance';

export const ATTENDANCE_POLICIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./attendance-policies'),
  },
  {
    path: 'new',
    loadComponent: () => import('./attendance-policy-form/attendance-policy-form'),
    title: `Add Attendance Policy | ${titleSuffix}`,
    // Module access alone would let a view-only role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(MODULE_KEY, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':attendancePolicyId/edit',
    loadComponent: () => import('./attendance-policy-form/attendance-policy-form'),
    title: `Edit Attendance Policy | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(MODULE_KEY, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];
