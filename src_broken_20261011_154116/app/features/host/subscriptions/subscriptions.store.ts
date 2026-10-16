import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { catchError, finalize, forkJoin, map, of, tap } from 'rxjs';

import { Common, IndustriesApi, SubscriptionsApi } from '@core/services';
import { SettledSearchTerm, SubscriptionPlan, UpdateSubscriptionPlanReq } from '@shared/interfaces';

import { toPlanRows } from './subscriptions.model';

interface SubscriptionsState {
  subscriptionPlans: SubscriptionPlan[];
  /** Server-side. `null` is the "All" option — the endpoint takes it as a nullable filter. */
  isActive: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: SubscriptionsState = {
  subscriptionPlans: [],
  isActive: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

/** `PUT /Subscription/{id}` replaces the whole plan, so every create field has to be resent. */
const toUpdateRequest = (
  plan: SubscriptionPlan,
  isActive: boolean,
  overrides: Partial<UpdateSubscriptionPlanReq> = {},
): UpdateSubscriptionPlanReq => ({
  id: plan.id,
  planName: plan.planName,
  maxUsers: plan.maxUsers,
  isMostPopular: plan.isMostPopular ?? false,
  isCustom: plan.isCustom ?? false,
  currencyKey: plan.currencyKey,
  perDayPrice: plan.perDayPrice,
  isFree: plan.isFree,
  monthlyPrice: plan.monthlyPrice,
  yearlyPrice: plan.yearlyPrice,
  isActive,
  ...overrides,
});

export const SubscriptionsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const subscriptionsApi = inject(SubscriptionsApi);
    const industriesApi = inject(IndustriesApi);
    const commonService = inject(Common);

    const subscriptionPlansResource = rxResource({
      params: () => ({
        search: store.search(),
        isActive: store.isActive(),
        pageNumber: store.pageNumber(),
        pageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        subscriptionsApi.getHostSubscriptionPlans(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              subscriptionPlans: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
        ),
    });

    /** Unfiltered on purpose — one call covers every plan's Subscribers and MRR cells. */
    const institutionSubscriptionsResource = rxResource({
      stream: () =>
        industriesApi.getInstitutionSubscriptionPlans({}).pipe(
          // `data` is null when nothing is subscribed anywhere, which is not an error.
          map((res) => res.data ?? []),
          // These figures only decorate two columns, so a failure degrades to zeroes rather than
          // taking the grid down with it — `BaseService.handleError` rethrows.
          catchError(() => of([])),
        ),
    });

    return { subscriptionPlansResource, institutionSubscriptionsResource };
  }),
  withComputed((store) => ({
    /** Driven by the plans call alone, so the grid paints before the subscription figures land. */
    isLoading: computed(() => store.subscriptionPlansResource.isLoading()),
    planRows: computed(() =>
      toPlanRows(store.subscriptionPlans(), store.institutionSubscriptionsResource.value() ?? []),
    ),
  })),
  withMethods((store) => {
    const subscriptionsApi = inject(SubscriptionsApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        subscriptionPlans: store
          .subscriptionPlans()
          .map((plan) => (plan.id === id ? { ...plan, isUpdatingStatus } : plan)),
      });

    return {
      reloadSubscriptionPlans(): void {
        store.subscriptionPlansResource.reload();
      },

      /** `null` is the "All" option. A different filter invalidates the page the grid is on. */
      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive, pageNumber: 1 });
      },

      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      /**
       * Active/inactive flips through `PUT /Subscription/{id}` — there is no status endpoint.
       * The new value is the opposite of the row's own status, and the page is refetched because a
       * row that stops matching the filter changes both the page contents and the total.
       */
      toggleActive(plan: SubscriptionPlan): void {
        const isActive = !plan.isActive;

        setUpdatingStatus(plan.id, true);

        subscriptionsApi
          .updateSubscriptionPlan(toUpdateRequest(plan, isActive))
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              setUpdatingStatus(plan.id, false);
              if (res.isSucceeded) {
                store.subscriptionPlansResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              setUpdatingStatus(plan.id, false);
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /**
       * The row leaves the list, so both the page and the total come back from the server.
       * `onSettled` runs on success and failure alike, so the caller can close its dialog.
       */
      deleteSubscriptionPlan(plan: SubscriptionPlan, onSettled?: () => void): void {
        subscriptionsApi
          .deleteSubscriptionPlan({ id: plan.id })
          .pipe(
            finalize(() => onSettled?.()),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.subscriptionPlansResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /**
       * Only one plan may carry the badge, so promoting one demotes whoever holds it.
       * That is a PUT per affected plan — the API has no bulk or dedicated flag endpoint.
       */
      toggleMostPopular(plan: SubscriptionPlan): void {
        const isMostPopular = !(plan.isMostPopular ?? false);
        const demoted = isMostPopular
          ? store.subscriptionPlans().filter((p) => p.id !== plan.id && p.isMostPopular)
          : [];

        forkJoin([
          subscriptionsApi.updateSubscriptionPlan(
            toUpdateRequest(plan, plan.isActive ?? true, { isMostPopular }),
          ),
          ...demoted.map((p) =>
            subscriptionsApi.updateSubscriptionPlan(
              toUpdateRequest(p, p.isActive ?? true, { isMostPopular: false }),
            ),
          ),
        ])
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (responses) => {
              const failed = responses.find((res) => !res.isSucceeded);
              if (failed) {
                // A later PUT can fail after an earlier one landed, so resync rather than guess.
                commonService.showMessage(failed.message, 'error');
                store.subscriptionPlansResource.reload();
                return;
              }

              const demotedIds = new Set(demoted.map((p) => p.id));
              patchState(store, {
                subscriptionPlans: store.subscriptionPlans().map((p) => {
                  if (p.id === plan.id) {
                    return { ...p, isMostPopular };
                  }
                  return demotedIds.has(p.id) ? { ...p, isMostPopular: false } : p;
                }),
              });
              commonService.showMessage(responses[0].message, 'success');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
              store.subscriptionPlansResource.reload();
            },
          });
      },
    };
  }),
);
