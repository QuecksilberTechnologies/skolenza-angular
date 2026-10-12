import { Routes } from '@angular/router';

import { InstitutionRoleTypeId } from '@shared/utilities/login-info';
import { roleTypeGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const LEARNING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ld-shell/ld-shell'),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./ld-dashboard/ld-dashboard'),
        title: `Learning Dashboard | ${titleSuffix}`,
      },
      {
        path: 'my-learning',
        loadComponent: () => import('./ld-my-learning/ld-my-learning'),
        title: `My Learning | ${titleSuffix}`,
      },
      {
        path: 'catalog',
        loadComponent: () => import('./ld-catalog/ld-catalog'),
        title: `Course Catalog | ${titleSuffix}`,
      },
      {
        path: 'catalog/:id',
        loadComponent: () => import('./ld-course-details/ld-course-details'),
        title: `Course Details | ${titleSuffix}`,
      },
      {
        path: 'certificates',
        loadComponent: () => import('./ld-certificates/ld-certificates'),
        title: `Certificates | ${titleSuffix}`,
      },
      {
        path: 'paths',
        loadComponent: () => import('./ld-paths/ld-paths'),
        title: `Learning Paths | ${titleSuffix}`,
      },
      {
        path: 'assigned',
        loadComponent: () => import('./ld-assigned/ld-assigned'),
        title: `Assigned Courses | ${titleSuffix}`,
      },
      {
        path: 'assessments',
        loadComponent: () => import('./ld-assessments/ld-assessments'),
        title: `Assessments | ${titleSuffix}`,
      },
      {
        path: 'calendar',
        loadComponent: () => import('./ld-calendar/ld-calendar'),
        title: `Learning Calendar | ${titleSuffix}`,
      },
      {
        path: 'knowledge',
        loadComponent: () => import('./ld-knowledge/ld-knowledge'),
        title: `Knowledge Base | ${titleSuffix}`,
      },
      {
        path: 'admin',
        loadComponent: () => import('./ld-admin/ld-admin'),
        title: `Learning Admin | ${titleSuffix}`,
        canActivate: [
          roleTypeGuard([
            InstitutionRoleTypeId.InstitutionAdministrator,
            InstitutionRoleTypeId.StaffManager,
          ]),
        ],
      },
    ],
  },
];
