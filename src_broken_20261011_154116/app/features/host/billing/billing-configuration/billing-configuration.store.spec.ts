import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiError, Common, HostBillingApi } from '@core/services';
import { HostBillingConfiguration, HostBillingConfigurationReq } from '@shared/interfaces';

import { BillingConfigurationStore } from './billing-configuration.store';

type Spy = ReturnType<typeof vi.fn>;

const billingConfiguration = (
  over: Partial<HostBillingConfiguration> = {},
): HostBillingConfiguration => ({
  id: 1,
  gatewayCode: 'CASHFREE',
  gatewayName: 'Cashfree Payments',
  environment: 'Sandbox',
  sellerLegalName: 'Example Private Limited',
  sellerBillingEmail: 'billing@example.com',
  sellerBillingPhone: null,
  countryCode: 'IN',
  stateCode: 'MP',
  postalCode: '482001',
  addressLine1: 'Example registered address',
  addressLine2: null,
  taxRegistrationNumber: '23ABCDE1234F1Z5',
  invoicePrefix: 'AXP',
  paymentRetryCount: 3,
  gracePeriodDays: 1,
  paymentTimeoutMinutes: 30,
  reconciliationLookbackDays: 7,
  isActive: true,
  version: 4,
  hasClientId: true,
  hasClientSecret: true,
  hasWebhookSecret: false,
  ...over,
});

const body: Omit<HostBillingConfigurationReq, 'version'> = {
  sellerLegalName: 'Example Private Limited',
  sellerBillingEmail: 'billing@example.com',
  sellerBillingPhone: null,
  countryCode: 'IN',
  stateCode: 'MP',
  postalCode: '482001',
  addressLine1: 'Example registered address',
  addressLine2: null,
  taxRegistrationNumber: '23ABCDE1234F1Z5',
  invoicePrefix: 'AXP',
  paymentRetryCount: 3,
  gracePeriodDays: 1,
  paymentTimeoutMinutes: 30,
  reconciliationLookbackDays: 7,
  isActive: true,
};

const ok = <T>(data: T) => ({ isSucceeded: true, message: 'Saved', data });

describe('BillingConfigurationStore', () => {
  let apiMock: { getConfiguration: Spy; updateConfiguration: Spy };
  let commonMock: { showMessage: Spy };
  let store: InstanceType<typeof BillingConfigurationStore>;

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    apiMock = {
      getConfiguration: vi.fn().mockReturnValue(of(ok(billingConfiguration()))),
      updateConfiguration: vi.fn().mockReturnValue(of(ok(billingConfiguration({ version: 5 })))),
    };
    commonMock = { showMessage: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        BillingConfigurationStore,
        { provide: HostBillingApi, useValue: apiMock },
        { provide: Common, useValue: commonMock },
      ],
    });
    store = TestBed.inject(BillingConfigurationStore);
    await settle();
  });

  it('loads the configuration', () => {
    expect(store.configuration()?.version).toBe(4);
    expect(store.isLoading()).toBe(false);
  });

  it('surfaces a failed read and leaves no record', async () => {
    apiMock.getConfiguration.mockReturnValue(throwError(() => new ApiError('Down', 500)));
    store.reload();
    await settle();

    expect(store.configuration()).toBeNull();
    expect(commonMock.showMessage).toHaveBeenCalledWith('Down', 'error');
  });

  it('sends the loaded version and replaces the record with the saved one', () => {
    store.save(body);

    expect(apiMock.updateConfiguration).toHaveBeenCalledWith({ ...body, version: 4 });
    expect(store.configuration()?.version).toBe(5);
    expect(store.isSaving()).toBe(false);
    expect(commonMock.showMessage).toHaveBeenCalledWith('Saved', 'success');
  });

  it('reloads on a version conflict instead of retrying the stale write', async () => {
    apiMock.updateConfiguration.mockReturnValue(throwError(() => new ApiError('Conflict', 409)));
    apiMock.getConfiguration.mockReturnValue(of(ok(billingConfiguration({ version: 6 }))));

    store.save(body);
    await settle();

    expect(apiMock.updateConfiguration).toHaveBeenCalledTimes(1);
    expect(store.configuration()?.version).toBe(6);
    expect(commonMock.showMessage).toHaveBeenCalledWith(expect.any(String), 'warn');
  });

  it('keeps the record on any other failure', () => {
    apiMock.updateConfiguration.mockReturnValue(throwError(() => new ApiError('Bad GSTIN', 400)));

    store.save(body);

    expect(store.configuration()?.version).toBe(4);
    expect(commonMock.showMessage).toHaveBeenCalledWith('Bad GSTIN', 'error');
  });
});
