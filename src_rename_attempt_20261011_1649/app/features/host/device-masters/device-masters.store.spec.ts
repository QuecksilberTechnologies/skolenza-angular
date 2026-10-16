import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DeviceMasterApi } from '@core/services';
import { DeviceMasterRow, DeviceType } from '@shared/interfaces';

import { DeviceMastersStore } from './device-masters.store';

function createDevice(overrides: Partial<DeviceMasterRow> = {}): DeviceMasterRow {
  return {
    id: 1,
    sNo: 'SN-0001',
    deviceCode: 'ZK-UF100',
    deviceName: 'UFace 100',
    modelNo: 'UF-100',
    productCode: null,
    companyName: 'ZKTeco',
    brandName: 'ZKTeco',
    countryOfOrigin: 'China',
    manufacturerWebsite: null,
    supportEmail: null,
    supportContactNumber: null,
    deviceType: DeviceType.MultiBiometric,
    isAttendanceDevice: true,
    isAccessControlDevice: false,
    supportsFace: true,
    supportsFingerprint: true,
    supportsCard: false,
    supportsPin: false,
    supportsQrCode: false,
    supportsTemperature: false,
    supportsHttp: true,
    supportsHttps: false,
    supportsWebSocket: false,
    supportsTcpIp: true,
    supportsCloudApi: false,
    supportsPushSdk: false,
    supportsMqtt: false,
    supportsMqtts: false,
    supportsWifi: true,
    supportsEthernet: true,
    supportsUsb: false,
    supportedTlsVersions: null,
    supportedProtocols: null,
    maxUserCapacity: 1000,
    maxFaceCapacity: 500,
    maxFingerprintCapacity: 1000,
    maxCardCapacity: null,
    maxAttendanceRecordCapacity: 100000,
    firmwareVersion: null,
    softwareVersion: null,
    operatingSystem: null,
    processorInfo: null,
    memoryInfo: null,
    storageInfo: null,
    displayInfo: null,
    cameraInfo: null,
    sensorInfo: null,
    powerRequirement: null,
    operatingTemperature: null,
    dimensions: null,
    weight: null,
    features: null,
    technicalSpecifications: null,
    price: 25000,
    currencyKey: 'INR',
    warrantyPeriodMonths: 12,
    warrantyDescription: null,
    isIntegrationSupported: false,
    integrationType: null,
    apiDocumentationUrl: null,
    sdkDocumentationUrl: null,
    imageUrl: null,
    thumbnailUrl: null,
    brochureUrl: null,
    manualUrl: null,
    shortDescription: null,
    description: null,
    additionalInfo: null,
    remark: null,
    isRecommended: false,
    isActive: true,
    ...overrides,
  };
}

describe('DeviceMastersStore', () => {
  const deviceMasterApiMock = {
    getDeviceMasters: vi.fn(),
    setDeviceMasterStatus: vi.fn(),
    deleteDeviceMaster: vi.fn(),
  };

  const createStore = (deviceMasters: DeviceMasterRow[]) => {
    const store = TestBed.inject(DeviceMastersStore);
    patchState(store as never, { deviceMasters });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    deviceMasterApiMock.getDeviceMasters.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    deviceMasterApiMock.setDeviceMasterStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Status updated.', errors: [], data: null }),
    );
    deviceMasterApiMock.deleteDeviceMaster.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        DeviceMastersStore,
        { provide: DeviceMasterApi, useValue: deviceMasterApiMock },
      ],
    });
  });

  it('re-queries with the selected device type and status', async () => {
    const store = TestBed.inject(DeviceMastersStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setDeviceType(DeviceType.Fingerprint);
    store.setIsActive(false);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(deviceMasterApiMock.getDeviceMasters).toHaveBeenLastCalledWith({
      Search: '',
      DeviceType: DeviceType.Fingerprint,
      IsActive: false,
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('keeps the rows and total from a successful page', async () => {
    deviceMasterApiMock.getDeviceMasters.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [createDevice({ id: 7 })],
        totalRecords: 42,
      }),
    );

    const store = TestBed.inject(DeviceMastersStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.deviceMasters().map((row) => row.id)).toEqual([7]);
    expect(store.totalRecords()).toBe(42);
  });

  it('sends the requested page back to the API', async () => {
    const store = TestBed.inject(DeviceMastersStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(deviceMasterApiMock.getDeviceMasters).toHaveBeenLastCalledWith(
      expect.objectContaining({ PageNumber: 3, PageSize: 10 }),
    );
  });

  it('returns to the first page when a filter changes', async () => {
    const store = TestBed.inject(DeviceMastersStore);
    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    store.setIsActive(true);

    expect(store.pageNumber()).toBe(1);
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = createStore([createDevice({ id: 7 })]);
    deviceMasterApiMock.getDeviceMasters.mockReturnValue(throwError(() => new Error('boom')));

    store.setIsActive(true);
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.deviceMasters()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
    expect(store.isLoading()).toBe(false);
  });

  describe('toggleActive', () => {
    it('sends the flipped status for the row', () => {
      const store = createStore([createDevice({ id: 7, isActive: true })]);

      store.toggleActive(store.deviceMasters()[0]);

      expect(deviceMasterApiMock.setDeviceMasterStatus).toHaveBeenCalledWith({
        id: 7,
        isActive: false,
      });
    });

    it('clears the row spinner when the call fails', () => {
      deviceMasterApiMock.setDeviceMasterStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = createStore([createDevice({ id: 7, isActive: true })]);

      store.toggleActive(store.deviceMasters()[0]);

      expect(store.deviceMasters()).toEqual([
        expect.objectContaining({ id: 7, isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deleteDeviceMaster', () => {
    it('sends the row id', () => {
      const store = createStore([createDevice({ id: 7 })]);

      store.deleteDeviceMaster(store.deviceMasters()[0]);

      expect(deviceMasterApiMock.deleteDeviceMaster).toHaveBeenCalledWith(7);
    });

    it('clears the row spinner when the call fails', () => {
      deviceMasterApiMock.deleteDeviceMaster.mockReturnValue(throwError(() => new Error('boom')));
      const store = createStore([createDevice({ id: 7 })]);

      store.deleteDeviceMaster(store.deviceMasters()[0]);

      expect(store.deviceMasters()).toEqual([
        expect.objectContaining({ id: 7, isDeleting: false }),
      ]);
    });
  });
});
