import { inject } from '@angular/core';
import { Router, RouterStateSnapshot, Routes } from '@angular/router';

import { isAuthenticatedGuard } from '@core/guards';
import { AuthApi } from '@core/services/auth-api';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/authentication/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/layout'),
    loadChildren: () => import('./features/features.routes').then((m) => m.FEATURES_ROUTES),
    canActivate: [isAuthenticatedGuard],
  },
  // Signed-in users reach an unprefixed URL (`/billing/x`) under `/app`, so it either resolves or
  // falls to the in-layout 404 there. Only signed-out users see this bare 404.
  {
    path: '**',
    canActivate: [
      (_: unknown, state: RouterStateSnapshot) =>
        inject(AuthApi).isAuthenticated() ? inject(Router).parseUrl(`/app${state.url}`) : true,
    ],
    loadComponent: () => import('./features/not-found/not-found'),
  },
];
