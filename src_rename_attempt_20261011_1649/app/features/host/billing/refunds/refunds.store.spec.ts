import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { HostRefund } from '@shared/interfaces';

import { RefundsStore } from './refunds.store';

function createRefund(overrides: Partial<HostRefund> = {}): HostRefund {
  return {
    id: 'de305d54-75b4-431b-adb2-eb6b9e546014',
    paymentTransactionId: 1,
    institutionId: 5,
    amount: 250,
    currencyCode: 'INR',
    reason: 'Approved partial service refund',
    status: 'Requested',
    gatewayRefundId: null,
    requestedByHostUserId: 1,
    requestedAt: '2026-10-01T10:00:00Z',
    completedAt: null,
    failureMessage: null,
    ...overrides,
  };
}

const page = (items: HostRefund[], totalRecords = items.length) => ({
  isSucceeded: true,
  message: '',
  data: { items, pageNumber: 1, pageSize: 10, totalRecords },
});

describe('RefundsStore', () => {
  const hostBillingApiMock = { getRefunds: vi.fn() };
  const whenStable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    hostBillingApiMock.getRefunds.mockReturnValue(of(page([])));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        RefundsStore,
        { provide: HostBillingApi, useValue: hostBillingApiMock },
      ],
    });
  });

  it('loads the first page on init and reads paging from inside `data`', async () => {
    hostBillingApiMock.getRefunds.mockReturnValue(of(page([createRefund()], 12)));
    const store = TestBed.inject(RefundsStore);
    await whenStable();

    // No `Search` — the endpoint filters on status only.
    expect(hostBillingApiMock.getRefunds).toHaveBeenCalledWith({
      Status: null,
      PageNumber: 1,
      PageSize: 10,
    });
    expect(store.refunds()).toEqual([createRefund()]);
    expect(store.totalRecords()).toBe(12);
  });

  it('resets to the first page when the status filter changes', async () => {
    const store = TestBed.inject(RefundsStore);
    await whenStable();

    store.loadPage({ first: 20, rows: 25 });
    await whenStable();
    expect(hostBillingApiMock.getRefunds).toHaveBeenLastCalledWith({
      Status: null,
      PageNumber: 1,
      PageSize: 25,
    });

    store.loadPage({ first: 25, rows: 25 });
    store.setStatus('Requested');
    await whenStable();

    expect(hostBillingApiMock.getRefunds).toHaveBeenLastCalledWith({
      Status: 'Requested',
      PageNumber: 1,
      PageSize: 25,
    });
  });

  it('refetches on reload', async () => {
    const store = TestBed.inject(RefundsStore);
    await whenStable();
    const calls = hostBillingApiMock.getRefunds.mock.calls.length;

    store.reloadRefunds();
    await whenStable();

    expect(hostBillingApiMock.getRefunds.mock.calls.length).toBe(calls + 1);
  });

  it('clears the grid when the call throws', async () => {
    hostBillingApiMock.getRefunds.mockReturnValue(of(page([createRefund()])));
    const store = TestBed.inject(RefundsStore);
    await whenStable();

    hostBillingApiMock.getRefunds.mockReturnValue(throwError(() => new Error('boom')));
    store.setStatus('Failed');
    await whenStable();

    expect(store.refunds()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
  });
});
