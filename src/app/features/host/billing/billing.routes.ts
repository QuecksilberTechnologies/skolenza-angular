import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

/**
 * `/app/billing/*` — the paths `GET /Navigation/my-menu` publishes as `urlPath` for the seven
 * `HOST_BILLING_*` leaves, so the sidebar link and the route agree.
 *
 * Operation-level gating lives on each screen, keyed on the leaf's `moduleCode` through
 * `FeaturePageStore` — these modules are not in the `get-host-modules` catalog `HOST_MODULE` names.
 */
export const BILLING_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'configuration' },
  {
    path: 'configuration',
    loadComponent: () => import('./billing-configuration/billing-configuration'),
    title: `Billing Configuration | ${titleSuffix}`,
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'plan-prices',
    loadComponent: () => import('./plan-prices/plan-prices'),
    title: `Plan Pricing | ${titleSuffix}`,
  },
  {
    path: 'tax-rules',
    loadComponent: () => import('./tax-rules/tax-rules'),
    title: `Tax Rules | ${titleSuffix}`,
  },
  {
    path: 'transactions',
    loadComponent: () => import('./transactions/transactions'),
    title: `Payment Transactions | ${titleSuffix}`,
  },
  {
    path: 'refunds',
    loadComponent: () => import('./refunds/refunds'),
    title: `Refunds | ${titleSuffix}`,
  },
  {
    path: 'reconciliation',
    loadComponent: () => import('./reconciliation/reconciliation'),
    title: `Reconciliation | ${titleSuffix}`,
  },
  {
    path: 'audit',
    loadComponent: () => import('./billing-audit/billing-audit'),
    title: `Billing Audit | ${titleSuffix}`,
  },
];
