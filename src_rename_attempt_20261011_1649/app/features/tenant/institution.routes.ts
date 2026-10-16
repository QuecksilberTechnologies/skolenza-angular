import { Routes } from '@angular/router';

import { environment } from '@env/environment';

/**
 * The `/institution/*` family `GET /Navigation/my-menu` publishes under `INSTITUTION_MGMT`.
 *
 * `profile` is read-only and thin: the backend has no institution-scoped company read, and
 * `Institution/get-institution-by-id` is host-only (a institution token gets a 401 that signs the user out).
 * `INSTITUTION_SETTINGS` and `INSTITUTION_SUBSCRIPTION` are the two siblings that are NOT here: they already
 * have screens at `/app/setting` and `/app/setting/billing`, and the menu map points at those
 * rather than at a second copy.
 */
export const INSTITUTION_ROUTES: Routes = [
  {
    path: 'profile',
    loadComponent: () => import('./company-profile/company-profile'),
    title: `Company Profile | ${environment.appName}`,
  },
  {
    path: 'audit-logs',
    loadComponent: () => import('./audit-logs/audit-logs'),
    title: `Audit Logs | ${environment.appName}`,
    data: { pageTitle: 'Audit Logs' },
  },
];

