import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

// No `hasModuleOperationGuard` here. The institution permission catalog (`Institution/get-all-institution-
// operations`) names no module for this screen yet, and `canPerform` denies an unknown name — the
// guard would lock every institution admin out of the screens it is meant to protect. The Add and Edit
// entry points soft-gate on the `my-menu` operations instead, and the API is the backstop. Add the
// guard once the catalog names this module.
export const INSTITUTION_EMAIL_CONFIG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./institution-email-config'),
  },
  {
    path: 'new',
    loadComponent: () => import('./institution-email-config-form/institution-email-config-form'),
    title: `Add Email Configuration | ${titleSuffix}`,
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':configId/edit',
    loadComponent: () => import('./institution-email-config-form/institution-email-config-form'),
    title: `Edit Email Configuration | ${titleSuffix}`,
    canDeactivate: [unsavedChangesGuard],
  },
];

