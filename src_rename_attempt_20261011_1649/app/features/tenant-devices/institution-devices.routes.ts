import { Routes } from '@angular/router';

import { hasModuleOperationGuard } from '@core/guards';
import { environment } from '@env/environment';

const titleSuffix = environment.appName;

/** Backend module code behind `/api/InstitutionDeviceConfiguration/*` -
 *  see `docs/specs/InstitutionDeviceRuntimeSettingsUiHandoff.md`. Host principals are denied every route
 *  this key gates; only Institution admins/managers reach this feature (`adminManager` in
 *  `features.routes.ts`). */
const MODULE_KEY = 'INSTITUTION_DEVICE_CONFIGURATION';

export const INSTITUTION_DEVICES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./institution-devices'),
  },
  {
    path: ':institutionDeviceId/device-settings',
    loadComponent: () => import('./device-settings/device-settings'),
    title: `Device Settings | ${titleSuffix}`,
    canActivate: [hasModuleOperationGuard(MODULE_KEY, 'Update')],
  },
];
