import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DeviceMasterApi, InstitutionDeviceApi, InstitutionLocationApi, InstitutionsApi } from '@core/services';
import { InstitutionDeviceRow, InstitutionLocationRow } from '@shared/interfaces';

import { InstitutionDevicesStore } from './institution-devices.store';

function createDevice(overrides: Partial<InstitutionDeviceRow> = {}): InstitutionDeviceRow {
  return {
    id: '1',
    institutionId: 'TEN00005',
    institutionLocationId: 9,
    deviceMasterId: 3,
    deviceCode: 'HO-GATE-01',
    deviceName: 'Head Office Main Gate',
    installedDateTime: null,
    installedBy: null,
    installationRemark: null,
    isAttendanceDevice: true,
    description: null,
    remark: null,
    isActive: true,
    ...overrides,
  };
}

function createLocation(overrides: Partial<InstitutionLocationRow> = {}): InstitutionLocationRow {
  return { id: 9, locationName: 'Head Office', institutionId: 'TEN00005', isActive: true, ...overrides };
}

describe('InstitutionDevicesStore', () => {
  const institutionDeviceApiMock = {
    getInstitutionDevices: vi.fn(),
    setInstitutionDeviceStatus: vi.fn(),
    deleteInstitutionDevice: vi.fn(),
  };
  const institutionsApiMock = { getInstitutions: vi.fn() };
  const institutionLocationApiMock = { getInstitutionLocations: vi.fn() };
  const deviceMasterApiMock = { getDeviceMasters: vi.fn() };

  /** The write calls are institution-scoped, so the store under test starts with a institution chosen. */
  const createStore = (institutionDevices: InstitutionDeviceRow[]) => {
    const store = TestBed.inject(InstitutionDevicesStore);
    patchState(store as never, { institutionId: 'TEN00005', institutionDevices });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    institutionDeviceApiMock.getInstitutionDevices.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    institutionDeviceApiMock.setInstitutionDeviceStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Status updated.', errors: [], data: null }),
    );
    institutionDeviceApiMock.deleteInstitutionDevice.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );
    institutionsApiMock.getInstitutions.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    institutionLocationApiMock.getInstitutionLocations.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    deviceMasterApiMock.getDeviceMasters.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        InstitutionDevicesStore,
        { provide: InstitutionDeviceApi, useValue: institutionDeviceApiMock },
        { provide: InstitutionsApi, useValue: institutionsApiMock },
        { provide: InstitutionLocationApi, useValue: institutionLocationApiMock },
        { provide: DeviceMasterApi, useValue: deviceMasterApiMock },
      ],
    });
  });

  it('lists every institution until one is chosen', async () => {
    TestBed.inject(InstitutionDevicesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    // `InstitutionId: null` is dropped by `makeHttpParams`, so `get-all` answers across institutions.
    expect(institutionDeviceApiMock.getInstitutionDevices).toHaveBeenCalledWith(
      expect.objectContaining({ InstitutionId: null }),
    );
    // The location lookup is the one call that still needs a institution.
    expect(institutionLocationApiMock.getInstitutionLocations).not.toHaveBeenCalled();
    expect(institutionsApiMock.getInstitutions).toHaveBeenCalled();
  });

  it('re-queries with every selected filter', async () => {
    const store = TestBed.inject(InstitutionDevicesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setInstitutionId('TEN00005');
    store.setDeviceMasterId(3);
    store.setIsAttendanceDevice(true);
    store.setIsActive(true);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(institutionDeviceApiMock.getInstitutionDevices).toHaveBeenLastCalledWith({
      Search: '',
      InstitutionId: 'TEN00005',
      InstitutionLocationId: null,
      DeviceMasterId: 3,
      IsAttendanceDevice: true,
      IsActive: true,
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('drops the chosen location when the institution changes', async () => {
    const store = TestBed.inject(InstitutionDevicesStore);
    store.setInstitutionLocationId(9);

    store.setInstitutionId('TEN00006');

    expect(store.institutionLocationId()).toBeNull();
  });

  it('narrows the locations to the selected institution, keeping rows the API left unassigned', async () => {
    institutionLocationApiMock.getInstitutionLocations.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [
          createLocation({ id: 9, institutionId: 'TEN00005' }),
          createLocation({ id: 10, institutionId: 'TEN00006' }),
          // Unassigned rows stay visible in case the server ignores the `InstitutionId` we send.
          createLocation({ id: 11, institutionId: null }),
        ],
      }),
    );

    const store = TestBed.inject(InstitutionDevicesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setInstitutionId('TEN00005');
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.institutionLocations().map((location) => location.id)).toEqual([9, 11]);
  });

  it('scopes the location lookup to the chosen institution', async () => {
    const store = TestBed.inject(InstitutionDevicesStore);
    await TestBed.inject(ApplicationRef).whenStable();
    // The lookup is idle without a institution, so nothing goes out before one is picked.
    expect(institutionLocationApiMock.getInstitutionLocations).not.toHaveBeenCalled();

    store.setInstitutionId('TEN00005');
    await TestBed.inject(ApplicationRef).whenStable();

    // No `ModuleId` / `OperationId`: `moduleOperationInterceptor` resolves them from this
    // session's own `my-menu` tree, which publishes `HOST_CAMPUS_LIST` for a host.
    expect(institutionLocationApiMock.getInstitutionLocations).toHaveBeenCalledWith({
      InstitutionId: 'TEN00005',
      IsActive: true,
      PageSize: 500,
    });
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = createStore([createDevice({ id: '7' })]);
    institutionDeviceApiMock.getInstitutionDevices.mockReturnValue(throwError(() => new Error('boom')));

    store.setIsActive(true);
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.institutionDevices()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
  });

  describe('toggleActive', () => {
    it('sends the flipped status for the row', () => {
      const store = createStore([createDevice({ id: '7', isActive: true })]);

      store.toggleActive(store.institutionDevices()[0]);

      expect(institutionDeviceApiMock.setInstitutionDeviceStatus).toHaveBeenCalledWith({
        id: '7',
        isActive: false,
        institutionId: 'TEN00005',
      });
    });

    it('clears the row spinner when the call fails', () => {
      institutionDeviceApiMock.setInstitutionDeviceStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = createStore([createDevice({ id: '7', isActive: true })]);

      store.toggleActive(store.institutionDevices()[0]);

      expect(store.institutionDevices()).toEqual([
        expect.objectContaining({ id: '7', isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deleteInstitutionDevice', () => {
    // `delete` answers 400 without the institution, the same way `get-by-id` does.
    it('sends the row id and the institution', () => {
      const store = createStore([createDevice({ id: '7' })]);

      store.deleteInstitutionDevice(store.institutionDevices()[0]);

      expect(institutionDeviceApiMock.deleteInstitutionDevice).toHaveBeenCalledWith('7', 'TEN00005');
    });

    // Under "Any institution" the filter holds no id, so the institution has to come off the row.
    it('takes the institution from the row, not the filter', () => {
      const store = TestBed.inject(InstitutionDevicesStore);
      patchState(store as never, {
        institutionDevices: [createDevice({ id: '7', institutionId: 'TEN00009' })],
      });

      store.deleteInstitutionDevice(store.institutionDevices()[0]);

      expect(store.institutionId()).toBeNull();
      expect(institutionDeviceApiMock.deleteInstitutionDevice).toHaveBeenCalledWith('7', 'TEN00009');
    });
  });
});
