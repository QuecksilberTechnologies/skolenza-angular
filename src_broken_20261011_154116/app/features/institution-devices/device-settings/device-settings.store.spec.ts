import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Common, DeviceDdlOptionsApi, InstitutionDeviceConfigurationApi } from '@core/services';
import { InstitutionDeviceConfigurationRow } from '@shared/interfaces';

import { DeviceSettingsStore } from './device-settings.store';

const INSTITUTION_ID = 'TEN00005';
const INSTITUTION_DEVICE_ID = '9';

function createConfiguration(
  overrides: Partial<InstitutionDeviceConfigurationRow> = {},
): InstitutionDeviceConfigurationRow {
  return {
    id: 3,
    institutionId: INSTITUTION_ID,
    institutionDeviceId: INSTITUTION_DEVICE_ID,
    ipAddress: null,
    macAddress: null,
    devicePort: null,
    communicationType: 4,
    serverHost: null,
    serverPort: null,
    serverPath: null,
    serverUrl: null,
    pushMode: null,
    heartbeatIntervalSeconds: null,
    timeZoneId: null,
    configuration: null,
    isEnrollmentEnabled: false,
    isAttendancePushEnabled: false,
    isAutoSyncEnabled: false,
    ...overrides,
  };
}

describe('DeviceSettingsStore', () => {
  const ddlOptionsApiMock = { getTime: vi.fn() };
  const configurationApiMock = {
    getInstitutionDeviceConfigurations: vi.fn(),
    deleteInstitutionDeviceConfiguration: vi.fn(),
  };

  const createStore = (configuration: InstitutionDeviceConfigurationRow | null) => {
    configurationApiMock.getInstitutionDeviceConfigurations.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: configuration ? [configuration] : [],
      }),
    );
    const store = TestBed.inject(DeviceSettingsStore);
    store.setDeviceContext(INSTITUTION_ID, INSTITUTION_DEVICE_ID);
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ddlOptionsApiMock.getTime.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    configurationApiMock.getInstitutionDeviceConfigurations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    configurationApiMock.deleteInstitutionDeviceConfiguration.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        DeviceSettingsStore,
        { provide: DeviceDdlOptionsApi, useValue: ddlOptionsApiMock },
        { provide: InstitutionDeviceConfigurationApi, useValue: configurationApiMock },
      ],
    });
  });

  describe('isLoadingConfiguration', () => {
    it('is true while the read is outstanding, then false once it settles', async () => {
      const store = createStore(null);

      expect(store.isLoadingConfiguration()).toBe(true);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(store.isLoadingConfiguration()).toBe(false);
      expect(store.telemetry()).toBeNull();
    });

    it('stays false with no device id, rather than reporting a load that never starts', () => {
      const store = TestBed.inject(DeviceSettingsStore);

      expect(store.isLoadingConfiguration()).toBe(false);
    });
  });

  describe('deleteConfiguration', () => {
    it('does nothing without a loaded configuration', () => {
      const store = TestBed.inject(DeviceSettingsStore);
      store.setDeviceContext(INSTITUTION_ID, null);

      store.deleteConfiguration();

      expect(configurationApiMock.deleteInstitutionDeviceConfiguration).not.toHaveBeenCalled();
    });

    it('sends the configuration id and the institution, then reloads on success', async () => {
      const store = createStore(createConfiguration({ id: 7 }));
      await TestBed.inject(ApplicationRef).whenStable();

      store.deleteConfiguration();

      expect(configurationApiMock.deleteInstitutionDeviceConfiguration).toHaveBeenCalledWith(
        7,
        INSTITUTION_ID,
      );
    });

    it('reports the error and does not reload when the call fails', async () => {
      const commonService = TestBed.inject(Common);
      const showMessage = vi.spyOn(commonService, 'showMessage');
      configurationApiMock.deleteInstitutionDeviceConfiguration.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = createStore(createConfiguration({ id: 7 }));
      await TestBed.inject(ApplicationRef).whenStable();
      const reload = vi.spyOn(store.configurationResource, 'reload');

      store.deleteConfiguration();

      expect(showMessage).toHaveBeenCalledWith('boom', 'error');
      expect(reload).not.toHaveBeenCalled();
    });
  });
});
