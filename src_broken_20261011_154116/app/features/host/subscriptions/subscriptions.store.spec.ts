import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { IndustriesApi, SubscriptionsApi } from '@core/services';
import {
  SettledSearchTerm,
  SubscriptionPlan,
  InstitutionSubscriptionPlan,
  UpdateSubscriptionPlanReq,
} from '@shared/interfaces';

import { SubscriptionsStore } from './subscriptions.store';

function createPlan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return {
    id: 1,
    planName: 'Pro-Basic',
    maxUsers: 10,
    perDayPrice: 10,
    isFree: false,
    monthlyPrice: 200,
    yearlyPrice: 2199,
    isMostPopular: false,
    isCustom: false,
    currencyKey: 'INR',
    modules: [],
    isActive: true,
    ...overrides,
  };
}

function createSubscription(
  overrides: Partial<InstitutionSubscriptionPlan> = {},
): InstitutionSubscriptionPlan {
  return {
    id: 1,
    institutionId: 54,
    subscriptionPlanId: 2,
    subscriptionStartDate: '2026-03-19T00:00:00Z',
    subscriptionEndDate: '2099-01-01T00:00:00Z',
    isActive: true,
    paymentTxnId: null,
    paymentMode: null,
    isTrial: true,
    ...overrides,
  };
}

describe('SubscriptionsStore', () => {
  const subscriptionsApiMock = {
    getHostSubscriptionPlans: vi.fn(),
    updateSubscriptionPlan: vi.fn(),
    deleteSubscriptionPlan: vi.fn(),
  };
  const industriesApiMock = { getInstitutionSubscriptionPlans: vi.fn() };

  const createStore = (plans: SubscriptionPlan[], isActive: boolean | null = true) => {
    const store = TestBed.inject(SubscriptionsStore);
    patchState(store as never, { subscriptionPlans: plans, isActive });
    return store;
  };

  const servePlans = (plans: SubscriptionPlan[], totalRecords = plans.length) =>
    subscriptionsApiMock.getHostSubscriptionPlans.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: plans,
        pageNumber: 1,
        pageSize: 10,
        totalRecords,
        totalPages: 1,
      }),
    );

  const listRequests = () =>
    subscriptionsApiMock.getHostSubscriptionPlans.mock.calls.map((call) => call[0]);

  const updatePayloads = (): UpdateSubscriptionPlanReq[] =>
    subscriptionsApiMock.updateSubscriptionPlan.mock.calls.map((call) => call[0]);

  beforeEach(() => {
    vi.clearAllMocks();
    servePlans([]);
    subscriptionsApiMock.updateSubscriptionPlan.mockReturnValue(
      of({ isSucceeded: true, message: 'Plan updated.', errors: [], data: null }),
    );
    subscriptionsApiMock.deleteSubscriptionPlan.mockReturnValue(
      of({ isSucceeded: true, message: 'Plan deleted.', errors: [], data: null }),
    );
    industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        SubscriptionsStore,
        { provide: SubscriptionsApi, useValue: subscriptionsApiMock },
        { provide: IndustriesApi, useValue: industriesApiMock },
      ],
    });
  });

  describe('planRows', () => {
    /** Both resources have to settle, so the plans come from the API mock rather than patchState. */
    const createLoadedStore = async (plans: SubscriptionPlan[]) => {
      servePlans(plans);
      const store = TestBed.inject(SubscriptionsStore);
      await TestBed.inject(ApplicationRef).whenStable();
      return store;
    };

    it('decorates each plan with its subscriber count and MRR', async () => {
      industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(
        of({
          isSucceeded: true,
          message: '',
          errors: [],
          data: [
            createSubscription({ id: 1, subscriptionPlanId: 2 }),
            createSubscription({ id: 2, subscriptionPlanId: 2 }),
          ],
        }),
      );

      const store = await createLoadedStore([
        createPlan({ id: 1 }),
        createPlan({ id: 2, monthlyPrice: 349 }),
      ]);

      expect(store.planRows().map((row) => [row.id, row.subscribers, row.mrr])).toEqual([
        [1, 0, 0],
        [2, 2, 698],
      ]);
    });

    it('degrades to zeroes rather than blanking the grid when the call fails', async () => {
      industriesApiMock.getInstitutionSubscriptionPlans.mockReturnValue(
        throwError(() => new Error('boom')),
      );

      const store = await createLoadedStore([createPlan({ id: 1 })]);

      expect(store.planRows()).toEqual([expect.objectContaining({ subscribers: 0, mrr: 0 })]);
    });
  });

  describe('list request', () => {
    it('asks for the first page of everything on startup', async () => {
      servePlans([createPlan({ id: 1 })], 4);

      const store = TestBed.inject(SubscriptionsStore);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(listRequests()).toEqual([{ search: '', isActive: null, pageNumber: 1, pageSize: 10 }]);
      expect(store.totalRecords()).toBe(4);
    });

    it('keeps the status the server reports rather than the one the filter holds', async () => {
      servePlans([createPlan({ id: 1, isActive: false })]);

      const store = TestBed.inject(SubscriptionsStore);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(store.subscriptionPlans().map((p) => [p.id, p.isActive])).toEqual([[1, false]]);
    });

    it('sends the status filter in a single call', async () => {
      const store = TestBed.inject(SubscriptionsStore);
      await TestBed.inject(ApplicationRef).whenStable();
      subscriptionsApiMock.getHostSubscriptionPlans.mockClear();

      store.setIsActive(false);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(listRequests()).toEqual([
        { search: '', isActive: false, pageNumber: 1, pageSize: 10 },
      ]);
    });

    it('returns to the first page when the filter changes', async () => {
      const store = TestBed.inject(SubscriptionsStore);
      await TestBed.inject(ApplicationRef).whenStable();

      store.loadPage({ first: 20, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();
      expect(store.pageNumber()).toBe(3);

      store.setIsActive(true);
      expect(store.pageNumber()).toBe(1);
    });

    it('carries the page and page size the paginator reports', async () => {
      const store = TestBed.inject(SubscriptionsStore);
      await TestBed.inject(ApplicationRef).whenStable();
      subscriptionsApiMock.getHostSubscriptionPlans.mockClear();

      store.loadPage({ first: 50, rows: 25 });
      await TestBed.inject(ApplicationRef).whenStable();

      expect(listRequests()).toEqual([{ search: '', isActive: null, pageNumber: 3, pageSize: 25 }]);
    });

    it('fetches page 1 for a new search term', async () => {
      const store = TestBed.inject(SubscriptionsStore);
      await TestBed.inject(ApplicationRef).whenStable();
      subscriptionsApiMock.getHostSubscriptionPlans.mockClear();

      store.setSearch('pro' as SettledSearchTerm);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(listRequests()).toEqual([
        { search: 'pro', isActive: null, pageNumber: 1, pageSize: 10 },
      ]);
    });
  });

  describe('toggleActive', () => {
    it('flips to the opposite of the row status and takes the page back from the server', async () => {
      const plan = createPlan({ id: 1, isActive: true });
      const store = createStore([plan, createPlan({ id: 2, isActive: true })], true);
      servePlans([createPlan({ id: 2, isActive: true })], 1);

      store.toggleActive(plan);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(updatePayloads()).toEqual([expect.objectContaining({ id: 1, isActive: false })]);
      expect(store.subscriptionPlans().map((p) => p.id)).toEqual([2]);
      expect(store.totalRecords()).toBe(1);
    });

    it('leaves the list alone when the update fails', async () => {
      const plan = createPlan({ id: 1, isActive: true });
      const store = createStore([plan], true);
      subscriptionsApiMock.updateSubscriptionPlan.mockReturnValue(
        of({ isSucceeded: false, message: 'Nope.', errors: [], data: null }),
      );
      subscriptionsApiMock.getHostSubscriptionPlans.mockClear();

      store.toggleActive(plan);

      expect(subscriptionsApiMock.getHostSubscriptionPlans).not.toHaveBeenCalled();
      expect(store.subscriptionPlans().map((p) => p.id)).toEqual([1]);
    });
  });

  describe('deleteSubscriptionPlan', () => {
    it('sends the plan id and refetches the page', async () => {
      const plan = createPlan({ id: 1 });
      const store = createStore([plan, createPlan({ id: 2 })], true);
      servePlans([createPlan({ id: 2 })], 1);

      store.deleteSubscriptionPlan(plan);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(subscriptionsApiMock.deleteSubscriptionPlan).toHaveBeenCalledWith({ id: 1 });
      expect(store.subscriptionPlans().map((p) => p.id)).toEqual([2]);
      expect(store.totalRecords()).toBe(1);
    });

    it('runs the settle hook whether the call succeeds or fails', () => {
      const plan = createPlan({ id: 1 });
      const store = createStore([plan], true);
      const onSettled = vi.fn();

      store.deleteSubscriptionPlan(plan, onSettled);
      expect(onSettled).toHaveBeenCalledTimes(1);

      subscriptionsApiMock.deleteSubscriptionPlan.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      store.deleteSubscriptionPlan(plan, onSettled);

      expect(onSettled).toHaveBeenCalledTimes(2);
    });

    it('keeps the row when the server refuses', () => {
      const plan = createPlan({ id: 1 });
      const store = createStore([plan], true);
      subscriptionsApiMock.deleteSubscriptionPlan.mockReturnValue(
        of({ isSucceeded: false, message: 'Plan is in use.', errors: [], data: null }),
      );
      subscriptionsApiMock.getHostSubscriptionPlans.mockClear();

      store.deleteSubscriptionPlan(plan);

      expect(subscriptionsApiMock.getHostSubscriptionPlans).not.toHaveBeenCalled();
      expect(store.subscriptionPlans().map((p) => p.id)).toEqual([1]);
    });
  });

  describe('toggleMostPopular', () => {
    it('resends the status each plan carries rather than the one the filter holds', () => {
      const target = createPlan({ id: 1, isActive: false });
      const incumbent = createPlan({ id: 2, isMostPopular: true, isActive: true });
      const store = createStore([target, incumbent], null);

      store.toggleMostPopular(target);

      expect(updatePayloads()).toEqual([
        expect.objectContaining({ id: 1, isActive: false }),
        expect.objectContaining({ id: 2, isActive: true }),
      ]);
      expect(store.subscriptionPlans().map((p) => p.isActive)).toEqual([false, true]);
    });

    it('promotes the plan and demotes the one already holding the badge', () => {
      const target = createPlan({ id: 1, planName: 'Pro-Basic' });
      const incumbent = createPlan({ id: 2, planName: 'Pro Team Plan', isMostPopular: true });
      const store = createStore([target, incumbent]);

      store.toggleMostPopular(target);

      expect(updatePayloads()).toEqual([
        expect.objectContaining({ id: 1, isMostPopular: true }),
        expect.objectContaining({ id: 2, isMostPopular: false }),
      ]);
      expect(store.subscriptionPlans().map((p) => [p.id, p.isMostPopular])).toEqual([
        [1, true],
        [2, false],
      ]);
    });

    it('sends a single request when no other plan holds the badge', () => {
      const target = createPlan({ id: 1 });
      const store = createStore([target, createPlan({ id: 2, isMostPopular: false })]);

      store.toggleMostPopular(target);

      expect(updatePayloads()).toEqual([expect.objectContaining({ id: 1, isMostPopular: true })]);
    });

    it('demotes without touching other plans when unsetting', () => {
      const target = createPlan({ id: 1, isMostPopular: true });
      const other = createPlan({ id: 2, isMostPopular: true });
      const store = createStore([target, other]);

      store.toggleMostPopular(target);

      expect(updatePayloads()).toEqual([expect.objectContaining({ id: 1, isMostPopular: false })]);
      expect(store.subscriptionPlans().map((p) => p.isMostPopular)).toEqual([false, true]);
    });

    it('resyncs from the server instead of guessing when a request fails', () => {
      const target = createPlan({ id: 1 });
      const incumbent = createPlan({ id: 2, isMostPopular: true });
      const store = createStore([target, incumbent]);
      subscriptionsApiMock.updateSubscriptionPlan.mockReturnValue(
        of({ isSucceeded: false, message: 'Nope.', errors: [], data: null }),
      );
      // The reload wins over any local guess, so serve the server's unchanged view.
      servePlans([target, incumbent]);
      subscriptionsApiMock.getHostSubscriptionPlans.mockClear();

      store.toggleMostPopular(target);
      TestBed.tick();

      expect(subscriptionsApiMock.getHostSubscriptionPlans).toHaveBeenCalled();
      expect(store.subscriptionPlans().map((p) => [p.id, p.isMostPopular])).toEqual([
        [1, false],
        [2, true],
      ]);
    });

    it('carries the whole plan through the replace-style PUT', () => {
      const target = createPlan({ id: 1, planName: 'Pro-Basic', maxUsers: 10, currencyKey: 'INR' });
      const store = createStore([target]);

      store.toggleMostPopular(target);

      expect(updatePayloads()[0]).toEqual({
        id: 1,
        planName: 'Pro-Basic',
        maxUsers: 10,
        isMostPopular: true,
        isCustom: false,
        currencyKey: 'INR',
        perDayPrice: 10,
        isFree: false,
        monthlyPrice: 200,
        yearlyPrice: 2199,
        isActive: true,
      });
    });
  });
});
