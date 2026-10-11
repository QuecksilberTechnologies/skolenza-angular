import { Routes } from '@angular/router';

export const INSTITUTION_DEVICE_CONFIGURATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./institution-device-configurations'),
  },
];
