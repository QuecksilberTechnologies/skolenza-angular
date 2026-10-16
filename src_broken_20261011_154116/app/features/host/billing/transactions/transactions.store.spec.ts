import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { HostPaymentTransaction, SettledSearchTerm } from '@shared/interfaces';

import { TransactionsStore } from './transactions.store';

function createTransaction(
  overrides: Partial<HostPaymentTransaction> = {},
): HostPaymentTransaction {
  return {
    id: 1,
    billingOrderId: 'f5a1d6a2-0000-0000-0000-000000000001',
    institutionId: 5,
    institutionName: 'Acme',
    status: 'Succeeded',
    paymentMethod: 'UPI',
    currencyCode: 'INR',
    amount: 999,
    gatewayPaymentId: 'cf_1',
    bankReference: null,
    failureCode: null,
    failureMessage: null,
    paidAt: '2026-10-01T10:00:00Z',
    addedDateTime: '2026-10-01T09:59:00Z',
    ...overrides,
  };
}

const page = (items: HostPaymentTransaction[], totalRecords = items.length) => ({
  isSucceeded: true,
  message: '',
  data: { items, pageNumber: 1, pageSize: 10, totalRecords },
});

describe('TransactionsStore', () => {
  const hostBillingApiMock = { getTransactions: vi.fn() };
  const whenStable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    hostBillingApiMock.getTransactions.mockReturnValue(of(page([])));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        TransactionsStore,
        { provide: HostBillingApi, useValue: hostBillingApiMock },
      ],
    });
  });

  it('loads the first page on init and reads paging from inside `data`', async () => {
    hostBillingApiMock.getTransactions.mockReturnValue(of(page([createTransaction()], 42)));
    const store = TestBed.inject(TransactionsStore);
    await whenStable();

    expect(hostBillingApiMock.getTransactions).toHaveBeenCalledWith({
      Search: '',
      Status: null,
      PageNumber: 1,
      PageSize: 10,
    });
    expect(store.transactions()).toEqual([createTransaction()]);
    expect(store.totalRecords()).toBe(42);
  });

  it('resets to the first page when a filter changes', async () => {
    const store = TestBed.inject(TransactionsStore);
    await whenStable();

    store.loadPage({ first: 20, rows: 10 });
    await whenStable();
    store.setStatus('Failed');
    store.setSearch('acme' as SettledSearchTerm);
    await whenStable();

    expect(hostBillingApiMock.getTransactions).toHaveBeenLastCalledWith({
      Search: 'acme',
      Status: 'Failed',
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('clears the grid when the API reports a failure', async () => {
    hostBillingApiMock.getTransactions.mockReturnValue(
      of({ isSucceeded: false, message: 'Denied', data: null }),
    );
    const store = TestBed.inject(TransactionsStore);
    await whenStable();

    expect(store.transactions()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
  });

  it('clears the grid when the call throws', async () => {
    hostBillingApiMock.getTransactions.mockReturnValue(of(page([createTransaction()])));
    const store = TestBed.inject(TransactionsStore);
    await whenStable();

    hostBillingApiMock.getTransactions.mockReturnValue(throwError(() => new Error('boom')));
    store.setStatus('Pending');
    await whenStable();

    expect(store.transactions()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
  });
});
