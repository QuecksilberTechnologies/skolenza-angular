import { DOCUMENT } from '@angular/common';
import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { forkJoin } from 'rxjs';

import { Common, DashboardApi, SubscriptionsApi } from '@core/services';
import {
  DashboardStatisticRequest,
  GetAllSubscriptionPlanReq,
  GetInstitutionSubscriptionPlanReq,
  SubscriptionPlan,
  InstitutionSubscriptionPlan,
} from '@shared/interfaces';
import {
  BillingPeriod,
  maxYearlySavingPercent,
  orderPlans,
  salesEnquiryMailto,
  toDisplayPlan,
} from '@shared/utilities/subscription-plan';

export type { BillingPeriod };

interface SubscriptionState {
  plans: SubscriptionPlan[];
  institution: InstitutionSubscriptionPlan | null;
  institutionSubscriptionId: number | null;
  totalStaffMembers: number | null;
  selectedPeriod: BillingPeriod;
  isLoading: boolean;
  hasError: boolean;
}

const initialState: SubscriptionState = {
  plans: [],
  institution: null,
  institutionSubscriptionId: null,
  totalStaffMembers: null,
  selectedPeriod: 'yearly',
  isLoading: true,
  hasError: false,
};

export const SubscriptionStore = signalStore(
  withState(initialState),

  withComputed(({ plans, institutionSubscriptionId, institution, totalStaffMembers, selectedPeriod }) => {
    const displayPlans = computed(() =>
      orderPlans(plans().map((p) => toDisplayPlan(p, selectedPeriod()))),
    );

    const maxYearlySaving = computed(() => maxYearlySavingPercent(plans()));

    const currentPlan = computed(
      () => displayPlans().find((p) => p.id === institutionSubscriptionId()) ?? null,
    );

    const seatUsage = computed(() => {
      const max = currentPlan()?.maxUsers ?? 0;
      const used = totalStaffMembers() ?? 0;
      const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
      return { used, max, percent };
    });

    const renewal = computed(() => {
      const endDate = institution()?.subscriptionEndDate ?? null;
      if (!endDate) return { endDate: null as Date | null, daysRemaining: null as number | null };
      const end = new Date(endDate).getTime();
      const daysRemaining = Math.max(0, Math.ceil((end - new Date().getTime()) / 86_400_000));
      return { endDate: new Date(endDate), daysRemaining };
    });

    return { displayPlans, maxYearlySaving, currentPlan, seatUsage, renewal };
  }),

  withMethods((store) => {
    const subscriptionsApi = inject(SubscriptionsApi);
    const dashboardApi = inject(DashboardApi);
    const commonService = inject(Common);
    const router = inject(Router);
    const document = inject(DOCUMENT);

    async function load(): Promise<void> {
      patchState(store, { isLoading: true, hasError: false });

      const loginInfo = await commonService.getLoginInfo();
      const sessionUser = loginInfo?.user;

      const plansReq: GetAllSubscriptionPlanReq = { IsActive: true };
      // The DTO requires all three ids, but the API resolves the institution from the bearer token —
      // `StaffMemberId` is a GUID on the client, so both numeric ids fall back to 0.
      const institutionReq: GetInstitutionSubscriptionPlanReq = {
        StaffMemberId: Number(sessionUser?.staffMemberId) || 0,
        RoleId: Number(sessionUser?.primaryRole?.roleId) || 0,
        InstitutionId: 0,
        IsActive: true,
      };
      const statsReq: DashboardStatisticRequest = {
        RoleId: +(sessionUser?.primaryRole?.roleId ?? 0),
        UserStaffMemberId: sessionUser?.staffMemberId,
      };

      forkJoin({
        plans: subscriptionsApi.getAllSubscriptionPlan(plansReq),
        institution: subscriptionsApi.getInstitutionSubscriptionPlan(institutionReq),
        stats: dashboardApi.getDashboardStatistics(statsReq),
      }).subscribe({
        next: ({ plans, institution, stats }) => {
          patchState(store, {
            plans: plans?.data ?? [],
            institution: institution?.data ?? null,
            institutionSubscriptionId: institution?.data?.subscriptionPlanId ?? null,
            totalStaffMembers: stats?.totalStaffMembers ?? null,
            isLoading: false,
          });
        },
        error: () => {
          patchState(store, { isLoading: false, hasError: true });
          commonService.showMessage('Failed to load subscription details', 'error');
        },
      });
    }

    return {
      load,

      setPeriod(period: BillingPeriod): void {
        patchState(store, { selectedPeriod: period });
      },

      selectPlan(plan: SubscriptionPlan): void {
        // Custom plans are quoted, not self-serve — the CTA reads "Talk to sales".
        if (plan.isCustom) {
          document.defaultView?.location.assign(salesEnquiryMailto(plan.planName));
          return;
        }
        router.navigate(['/auth/register-institution'], { queryParams: { planId: plan.id } });
      },
    };
  }),
);
