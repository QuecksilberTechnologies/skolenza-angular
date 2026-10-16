import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, InstitutionDeviceApi } from '@core/services';

import { InstitutionDevicesStore } from './institution-devices.store';

describe('InstitutionDevicesStore', () => {
  const institutionDeviceApiMock = {
    getInstitutionDevices: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    institutionDeviceApiMock.getInstitutionDevices.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );

    TestBed.configureTestingModule({
      providers: [
        InstitutionDevicesStore,
        { provide: InstitutionDeviceApi, useValue: institutionDeviceApiMock },
        {
          provide: Common,
          useValue: {
            getPaginationParam: () => ({ page: 1, rows: 10 }),
            showMessage: vi.fn(),
          },
        },
      ],
    });
  });

  it('waits for the session institution and includes it in the list request', async () => {
    const store = TestBed.inject(InstitutionDevicesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionDeviceApiMock.getInstitutionDevices).not.toHaveBeenCalled();

    store.setInstitutionId('TEN00005');
    await TestBed.inject(ApplicationRef).whenStable();

    // No `ModuleId` / `OperationId`: `moduleOperationInterceptor` adds them from this session's
    // own `my-menu` tree, so a renumbered module never reaches this file.
    expect(institutionDeviceApiMock.getInstitutionDevices).toHaveBeenLastCalledWith({
      Search: '',
      InstitutionId: 'TEN00005',
      PageNumber: 1,
      PageSize: 10,
    });
  });
});
