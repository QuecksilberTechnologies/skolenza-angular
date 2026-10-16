import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HostBillingApi } from '@core/services';
import { HostPlanPrice } from '@shared/interfaces';

import { PlanPricesStore } from './plan-prices.store';

function createPlanPrice(overrides: Partial<HostPlanPrice> = {}): HostPlanPrice {
  return {
    id: 1,
    subscriptionPlanId: 2,
    planName: 'Growth',
    countryCode: 'IN',
    currencyCode: 'INR',
    billingCycle: 'Monthly',
    baseAmount: 999,
    effectiveFrom: '2026-10-01',
    effectiveTo: null,
    isActive: true,
    ...overrides,
  };
}

describe('PlanPricesStore', () => {
  const apiMock = {
    getPlanPrices: vi.fn(),
    deletePlanPrice: vi.fn(),
  };

  /** The resource loads on injection, so the rows have to come from the API mock. */
  const createStore = async (rows: HostPlanPrice[]) => {
    apiMock.getPlanPrices.mockReturnValue(of({ isSucceeded: true, message: '', data: rows }));
    const store = TestBed.inject(PlanPricesStore);
    await TestBed.inject(ApplicationRef).whenStable();
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getPlanPrices.mockReturnValue(of({ isSucceeded: true, message: '', data: [] }));
    apiMock.deletePlanPrice.mockReturnValue(
      of({ isSucceeded: true, message: 'Plan price deactivated successfully.', data: true }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        PlanPricesStore,
        { provide: HostBillingApi, useValue: apiMock },
      ],
    });
  });

  it('loads the whole list on open', async () => {
    const store = await createStore([createPlanPrice({ id: 3 })]);

    expect(apiMock.getPlanPrices).toHaveBeenCalledWith();
    expect(store.rows().map((row) => row.id)).toEqual([3]);
  });

  it('filters the rows already in hand rather than re-querying', async () => {
    const store = await createStore([
      createPlanPrice({ id: 1, planName: 'Growth' }),
      createPlanPrice({ id: 2, planName: 'Enterprise', billingCycle: 'Yearly' }),
    ]);
    const callsBefore = apiMock.getPlanPrices.mock.calls.length;

    store.setSearch('yearly');

    expect(store.visibleRows().map((row) => row.id)).toEqual([2]);
    expect(apiMock.getPlanPrices.mock.calls.length).toBe(callsBefore);
  });

  it('clears the grid when the list call fails', async () => {
    const store = await createStore([createPlanPrice()]);
    apiMock.getPlanPrices.mockReturnValue(throwError(() => new Error('boom')));

    store.reload();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rows()).toEqual([]);
  });

  it('clears the grid when the API refuses the read', async () => {
    const store = await createStore([createPlanPrice()]);
    apiMock.getPlanPrices.mockReturnValue(
      of({ isSucceeded: false, message: 'Denied', data: null }),
    );

    store.reload();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rows()).toEqual([]);
  });

  it('reloads the list after a successful deactivate', async () => {
    const store = await createStore([createPlanPrice({ id: 4 })]);
    const callsBefore = apiMock.getPlanPrices.mock.calls.length;

    store.deactivate(createPlanPrice({ id: 4 }));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(apiMock.deletePlanPrice).toHaveBeenCalledWith(4);
    expect(apiMock.getPlanPrices.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('keeps the row and does not reload when the deactivate is refused', async () => {
    const store = await createStore([createPlanPrice({ id: 5 })]);
    apiMock.deletePlanPrice.mockReturnValue(
      of({ isSucceeded: false, message: 'No.', data: false }),
    );
    const callsBefore = apiMock.getPlanPrices.mock.calls.length;

    store.deactivate(createPlanPrice({ id: 5 }));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.rows().map((row) => row.id)).toEqual([5]);
    expect(apiMock.getPlanPrices.mock.calls.length).toBe(callsBefore);
    // The per-row spinner is released whichever way the call goes.
    expect(store.rows()[0].isDeactivating).toBe(false);
  });
});
