import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InstitutionDeviceApi, InstitutionDeviceConfigurationApi, InstitutionsApi } from '@core/services';
import { DeviceCommunicationType, InstitutionDeviceConfigurationRow } from '@shared/interfaces';

import { InstitutionDeviceConfigurationsStore } from './institution-device-configurations.store';

function createConfiguration(
  overrides: Partial<InstitutionDeviceConfigurationRow> = {},
): InstitutionDeviceConfigurationRow {
  return {
    id: 1,
    institutionId: 'TEN00005',
    institutionDeviceId: '9',
    ipAddress: '192.168.1.50',
    macAddress: null,
    devicePort: 4370,
    communicationType: DeviceCommunicationType.Wss,
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

const INSTITUTION_ID = 'TEN00005';

describe('InstitutionDeviceConfigurationsStore', () => {
  const configurationApiMock = {
    getInstitutionDeviceConfigurations: vi.fn(),
  };
  const institutionDeviceApiMock = { getInstitutionDevices: vi.fn() };
  const institutionsApiMock = { getInstitutions: vi.fn() };

  const createStore = (configurations: InstitutionDeviceConfigurationRow[]) => {
    const store = TestBed.inject(InstitutionDeviceConfigurationsStore);
    patchState(store as never, { institutionId: INSTITUTION_ID, configurations });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    configurationApiMock.getInstitutionDeviceConfigurations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    institutionDeviceApiMock.getInstitutionDevices.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    institutionsApiMock.getInstitutions.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        InstitutionDeviceConfigurationsStore,
        { provide: InstitutionDeviceConfigurationApi, useValue: configurationApiMock },
        { provide: InstitutionDeviceApi, useValue: institutionDeviceApiMock },
        { provide: InstitutionsApi, useValue: institutionsApiMock },
      ],
    });
  });

  it('lists every institution until one is chosen', async () => {
    TestBed.inject(InstitutionDeviceConfigurationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    // `InstitutionId: null` is dropped by `makeHttpParams`, so `get-all` answers across institutions.
    expect(configurationApiMock.getInstitutionDeviceConfigurations).toHaveBeenCalledWith(
      expect.objectContaining({ InstitutionId: null }),
    );
    // The device lookup is the one call that still answers 400 without a institution.
    expect(institutionDeviceApiMock.getInstitutionDevices).not.toHaveBeenCalled();
    expect(institutionsApiMock.getInstitutions).toHaveBeenCalled();
  });

  it('stays on "Any institution" once the institution lookup resolves', async () => {
    institutionsApiMock.getInstitutions.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [{ id: INSTITUTION_ID, companyName: 'Acme' }],
      }),
    );

    const store = TestBed.inject(InstitutionDeviceConfigurationsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.institutionId()).toBeNull();
  });

  it('scopes the device lookup to the chosen institution', async () => {
    const store = TestBed.inject(InstitutionDeviceConfigurationsStore);

    store.setInstitutionId(INSTITUTION_ID);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionDeviceApiMock.getInstitutionDevices).toHaveBeenCalledWith({
      InstitutionId: INSTITUTION_ID,
      IsActive: true,
      PageSize: 500,
    });
  });

  it('drops the chosen device when the institution changes', () => {
    const store = TestBed.inject(InstitutionDeviceConfigurationsStore);
    store.setInstitutionId(INSTITUTION_ID);
    store.setInstitutionDeviceId('9');

    store.setInstitutionId('TEN00006');

    expect(store.institutionDeviceId()).toBeNull();
  });

  it('re-queries with every selected filter', async () => {
    const store = TestBed.inject(InstitutionDeviceConfigurationsStore);
    store.setInstitutionId(INSTITUTION_ID);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setInstitutionDeviceId('9');
    store.setCommunicationType(DeviceCommunicationType.Wss);
    store.setIsEnrollmentEnabled(true);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(configurationApiMock.getInstitutionDeviceConfigurations).toHaveBeenLastCalledWith({
      Search: '',
      InstitutionId: INSTITUTION_ID,
      InstitutionDeviceId: '9',
      CommunicationType: DeviceCommunicationType.Wss,
      IsEnrollmentEnabled: true,
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('returns to the first page when a filter changes', async () => {
    const store = TestBed.inject(InstitutionDeviceConfigurationsStore);
    patchState(store as never, { pageNumber: 3 });

    store.setCommunicationType(DeviceCommunicationType.Http);

    expect(store.pageNumber()).toBe(1);
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = createStore([createConfiguration({ id: 7 })]);
    configurationApiMock.getInstitutionDeviceConfigurations.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    store.setIsEnrollmentEnabled(true);
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.configurations()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
  });
});
