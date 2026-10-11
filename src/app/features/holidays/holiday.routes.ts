import { Routes } from '@angular/router';

import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const HOLIDAY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./holidays'),
    title: `Holidays | ${titleSuffix}`,
  },
];
