import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { ApiError, Common, SubscriptionsApi } from '@core/services';
import { GetAllSubscriptionPlanReq, SubscriptionPlan } from '@shared/interfaces';
import {
  BillingPeriod,
  maxYearlySavingPercent,
  orderPlans,
  toDisplayPlan,
} from '@shared/utilities/subscription-plan';

/** A 401/403 here is a misconfiguration, not something the visitor can act on. */
const AUTH_FAILURE_MESSAGE = "Plans aren't available right now — our team has been notified.";

interface PricingState {
  plans: SubscriptionPlan[];
  selectedPeriod: BillingPeriod;
  isLoading: boolean;
  errorMessage: string | null;
}

const initialState: PricingState = {
  plans: [],
  selectedPeriod: 'yearly',
  isLoading: true,
  errorMessage: null,
};

export const PricingStore = signalStore(
  withState(initialState),

  withComputed(({ plans, selectedPeriod }) => ({
    displayPlans: computed(() =>
      orderPlans(plans().map((plan) => toDisplayPlan(plan, selectedPeriod()))),
    ),
    maxYearlySaving: computed(() => maxYearlySavingPercent(plans())),
  })),

  withMethods((store) => {
    const subscriptionsApi = inject(SubscriptionsApi);
    const commonService = inject(Common);

    return {
      load(): void {
        patchState(store, { isLoading: true, errorMessage: null });

        const body: GetAllSubscriptionPlanReq = { IsActive: true };
        subscriptionsApi.getAllSubscriptionPlan(body).subscribe({
          next: (response) => {
            patchState(store, { plans: response?.data ?? [], isLoading: false });
          },
          error: (err: unknown) => {
            const reason = err instanceof Error ? err.message : 'Something went wrong';
            const status = err instanceof ApiError ? err.status : 0;
            patchState(store, {
              isLoading: false,
              errorMessage: status === 401 || status === 403 ? AUTH_FAILURE_MESSAGE : reason,
            });
            commonService.showMessage(reason, 'error');
          },
        });
      },

      setPeriod(period: BillingPeriod): void {
        patchState(store, { selectedPeriod: period });
      },
    };
  }),
);
