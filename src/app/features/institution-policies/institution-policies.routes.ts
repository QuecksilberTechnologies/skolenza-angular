import { Routes } from '@angular/router';

import { hasFeatureOperationGuard, unsavedChangesGuard } from '@core/guards';
import { environment } from '@env/environment';

import { DEFINITIONS_MODULE_CODE, POLICY_FORM_MODE_KEY } from './institution-policy-constants';

const titleSuffix = environment.appName;

export const INSTITUTION_POLICIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./policy-definitions/policy-definitions'),
    title: `Policies | ${titleSuffix}`,
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./policy-definitions/policy-definition-form/policy-definition-form'),
    title: `Create Policy | ${titleSuffix}`,
    data: { [POLICY_FORM_MODE_KEY]: 'create' },
    // The screen only writes, so it gates on the operation the list's Create button gates on.
    canActivate: [hasFeatureOperationGuard(DEFINITIONS_MODULE_CODE, 'Add')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    // The exact version the list row names (`currentVersionId`), which a newer Draft owns.
    path: ':policyId/versions/:versionId/edit',
    loadComponent: () =>
      import('./policy-definitions/policy-definition-form/policy-definition-form'),
    title: `Edit Policy | ${titleSuffix}`,
    data: { [POLICY_FORM_MODE_KEY]: 'edit' },
    canActivate: [hasFeatureOperationGuard(DEFINITIONS_MODULE_CODE, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'types',
    loadComponent: () => import('./policy-types/policy-types'),
    title: `Policy Types | ${titleSuffix}`,
  },
  {
    path: 'approval-stages',
    loadComponent: () => import('./policy-approval-stages/policy-approval-stages'),
    title: `Approval Stages | ${titleSuffix}`,
  },
  {
    // Nested workspace, not a menu leaf — reached from a row action on the policy list. Its tabs
    // each read through their own policy leaf's grant (`policy-version-workspace.store.ts`).
    path: ':policyId/versions/:versionId',
    loadComponent: () => import('./policy-version-workspace/policy-version-workspace'),
    title: `Policy Version | ${titleSuffix}`,
  },
];

