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
    loadComponent: () => import('./staffMember-basic-info/staffMember-basic-info'),
    title: `Basic Info | ${titleSuffix}`,
  },
  {
    path: 'education-info',
    loadComponent: () => import('./staffMember-education-info/staffMember-education-info'),
    title: `Education Info | ${titleSuffix}`,
  },
  {
    path: 'experience-info',
    loadComponent: () => import('./staffMember-experience-info/staffMember-experience-info'),
    title: `Experience Info | ${titleSuffix}`,
  },
  {
    path: 'bank-info',
    loadComponent: () => import('./staffMember-bank-info/staffMember-bank-info'),
    title: `Bank Info | ${titleSuffix}`,
  },
  {
    path: 'contact-info',
    loadComponent: () => import('./staffMember-contact-info/staffMember-contact-info'),
    title: `Contact Info | ${titleSuffix}`,
  },
  {
    path: 'dependent-info',
    loadComponent: () => import('./staffMember-dependent-info/staffMember-dependent-info'),
    title: `Dependent Info | ${titleSuffix}`,
  },
  {
    path: 'insurance-info',
    loadComponent: () => import('./staffMember-insurance-info/staffMember-insurance-info'),
    title: `Insurance Info | ${titleSuffix}`,
  },
  {
    path: 'policy-info',
    loadComponent: () => import('./staffMember-policy-info/staffMember-policy-info'),
    title: `Policy Info | ${titleSuffix}`,
  },
  {
    path: 'identity-info',
    loadComponent: () => import('./staffMember-identity-info/staffMember-identity-info'),
    title: `Identity Info | ${titleSuffix}`,
  },
  {
    path: 'leave-info',
    loadComponent: () => import('./staffMember-leave-info/staffMember-leave-info'),
    title: `Leave Info | ${titleSuffix}`,
  },
  {
    path: 'files-info',
    loadComponent: () => import('./staffMember-files-info/staffMember-files-info'),
    title: `Files Info | ${titleSuffix}`,
  },
  {
    path: '**',
    loadComponent: () => import('./../../not-found/not-found'),
  },
];
