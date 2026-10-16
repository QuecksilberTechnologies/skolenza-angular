import { Routes } from '@angular/router';

import { hasModulePermissionGuard, unsavedChangesGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./roles-list/roles-list'),
    canActivate: [hasModulePermissionGuard('Roles')],
  },
  {
    path: 'permissions/:roleId',
    loadComponent: () => import('./role-permissions/role-permissions'),
    title: `Role Permissions | ${titleSuffix}`,
    canActivate: [hasModulePermissionGuard('Roles')],
    canDeactivate: [unsavedChangesGuard],
  },
];
