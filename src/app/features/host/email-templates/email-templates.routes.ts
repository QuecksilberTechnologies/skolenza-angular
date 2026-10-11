import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { environment } from '@env/environment';

import { EMAIL_TEMPLATE_SCOPE, institutionEmailTemplateScope } from './email-template-scope';

const titleSuffix = environment.appName;

export const EMAIL_TEMPLATES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./email-templates'),
  },
  {
    path: 'new',
    loadComponent: () => import('./email-template-form/email-template-form'),
    title: `Add Email Template | ${titleSuffix}`,
    // Module access alone would let a view-only host role open a screen whose only purpose is
    // to write, so the create and edit screens gate on the operation itself.
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: ':templateId/edit',
    loadComponent: () => import('./email-template-form/email-template-form'),
    title: `Edit Email Template | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(HOST_MODULE.host, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];

/**
 * The Institution's own catalog, on the same screens. The route-level provider swaps the scope, which
 * is what points the store and form at `/InstitutionEmailTemplate` and adds the Sync button.
 *
 * No `hasModuleOperationGuard`: the institution permission catalog is not known to name this module,
 * and `canPerform` denies an unknown name. The entry points soft-gate on the `my-menu` operations
 * instead (see `institutionEmailTemplateScope`), and the API is the backstop.
 */
export const INSTITUTION_EMAIL_TEMPLATES_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: EMAIL_TEMPLATE_SCOPE, useFactory: institutionEmailTemplateScope }],
    children: [
      {
        path: '',
        loadComponent: () => import('./email-templates'),
      },
      {
        path: 'new',
        loadComponent: () => import('./email-template-form/email-template-form'),
        title: `Add Email Template | ${titleSuffix}`,
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: ':templateId/edit',
        loadComponent: () => import('./email-template-form/email-template-form'),
        title: `Edit Email Template | ${titleSuffix}`,
        canDeactivate: [unsavedChangesGuard],
      },
    ],
  },
];
