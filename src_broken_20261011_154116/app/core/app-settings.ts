import { InjectionToken } from '@angular/core';

import { AppSetting } from '@shared/interfaces';

export const appSettings: AppSetting = {
  version: '1.0.0',
};

export const APP_SETTINGS = new InjectionToken<AppSetting>('app-settings');
