import { Routes } from '@angular/router';

import { hasModuleOperationGuard, unsavedChangesGuard } from '@core/guards';
import { HOST_MODULE } from '@core/host-modules';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

export const HOST_ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./host-roles'),
  },
  {
    path: 'permissions/:hostRoleId',
    loadComponent: () => import('./host-role-permissions/host-role-permissions'),
    title: `Platform Role Permissions | ${titleSuffix}`,
    // This screen grants host permissions, so module access alone is not enough —
    // only a role that may update host roles can open it.
    canActivate: [hasModuleOperationGuard(HOST_MODULE.hostRole, 'Update')],
    canDeactivate: [unsavedChangesGuard],
  },
];
