import { Routes } from '@angular/router';

import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'basic-info',
    pathMatch: 'full',
  },
  {
    path: 'basic-info',
    loadComponent: () => import('./staff-member-basic-info/staff-member-basic-info'),
    title: `Basic Info | ${titleSuffix}`,
  },
  {
    path: 'education-info',
    loadComponent: () => import('./staff-member-education-info/staff-member-education-info'),
    title: `Education Info | ${titleSuffix}`,
  },
  {
    path: 'experience-info',
    loadComponent: () => import('./staff-member-experience-info/staff-member-experience-info'),
    title: `Experience Info | ${titleSuffix}`,
  },
  {
    path: 'bank-info',
    loadComponent: () => import('./staff-member-bank-info/staff-member-bank-info'),
    title: `Bank Info | ${titleSuffix}`,
  },
  {
    path: 'contact-info',
    loadComponent: () => import('./staff-member-contact-info/staff-member-contact-info'),
    title: `Contact Info | ${titleSuffix}`,
  },
  {
    path: 'dependent-info',
    loadComponent: () => import('./staff-member-dependent-info/staff-member-dependent-info'),
    title: `Dependent Info | ${titleSuffix}`,
  },
  {
    path: 'insurance-info',
    loadComponent: () => import('./staff-member-insurance-info/staff-member-insurance-info'),
    title: `Insurance Info | ${titleSuffix}`,
  },
  {
    path: 'policy-info',
    loadComponent: () => import('./staff-member-policy-info/staff-member-policy-info'),
    title: `Policy Info | ${titleSuffix}`,
  },
  {
    path: 'identity-info',
    loadComponent: () => import('./staff-member-identity-info/staff-member-identity-info'),
    title: `Identity Info | ${titleSuffix}`,
  },
  {
    path: 'leave-info',
    loadComponent: () => import('./staff-member-leave-info/staff-member-leave-info'),
    title: `Leave Info | ${titleSuffix}`,
  },
  {
    path: 'files-info',
    loadComponent: () => import('./staff-member-files-info/staff-member-files-info'),
    title: `Files Info | ${titleSuffix}`,
  },
  {
    path: '**',
    loadComponent: () => import('./../../not-found/not-found'),
  },
];
