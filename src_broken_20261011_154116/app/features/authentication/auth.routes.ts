import { Routes } from '@angular/router';

import { requirePlanIdGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login'),
    title: `Login | ${titleSuffix}`,
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password'),
    title: `Forgot Password | ${titleSuffix}`,
  },
  {
    path: 'verify-otp',
    loadComponent: () => import('./verify-otp/verify-otp'),
    title: `Verify OTP | ${titleSuffix}`,
  },
  // This will use when admin create new user
  {
    path: 'set-password',
    loadComponent: () => import('./set-password/set-password'),
    title: `Set Password | ${titleSuffix}`,
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password'),
    title: `Reset Password | ${titleSuffix}`,
  },
  {
    path: 'reset-success',
    loadComponent: () => import('./reset-success/reset-success'),
    title: `Reset Success | ${titleSuffix}`,
  },
  {
    path: 'plan',
    loadComponent: () => import('./pricing/pricing'),
    title: `Plan | ${titleSuffix}`,
  },
  {
    path: 'register-institution',
    loadComponent: () => import('./registration/registration'),
    canActivate: [requirePlanIdGuard],
    title: `Register Institution | ${titleSuffix}`,
  },
  {
    path: 'register-institution',
    redirectTo: 'register-institution',
    pathMatch: 'full',
  },
  {
    path: 'registration-email-check',
    loadComponent: () => import('./registration/registration-email-check/registration-email-check'),
    title: `Email Verification | ${titleSuffix}`,
  },
  {
    path: 'registration-verify',
    loadComponent: () => import('./registration/registration-verify/registration-verify'),
    title: `Registration Verification | ${titleSuffix}`,
  },
  {
    path: 'registration-password',
    loadComponent: () => import('./registration/registration-password/registration-password'),
    title: `Register Password | ${titleSuffix}`,
  },
];
