import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SelectButtonModule } from '@openng/optimus-ui/selectbutton';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';

import AuthHeaderLogo from '@shared/components/auth-header-logo/auth-header-logo';
import { PricingCardShimmer } from '@shared/components/pricing/pricing-card-shimmer/pricing-card-shimmer';
import { PricingCard } from '@shared/components/pricing/pricing-card/pricing-card';
import { SubscriptionPlan } from '@shared/interfaces';
import {
  BillingPeriod,
  SALES_EMAIL,
  salesEnquiryMailto,
} from '@shared/utilities/subscription-plan';

import { PricingStore } from './pricing.store';

@Component({
  selector: 'app-pricing',
  imports: [
    ButtonModule,
    FormsModule,
    SelectButtonModule,
    SkeletonModule,
    PricingCard,
    PricingCardShimmer,
    AuthHeaderLogo,
    RouterModule,
  ],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PricingStore],
})
export default class PricingComponent implements OnInit {
  protected readonly store = inject(PricingStore);
  readonly #router = inject(Router);
  readonly #document = inject(DOCUMENT);

  protected readonly supportEmail = SALES_EMAIL;
  protected readonly periodOptions = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
  ];
  /** Placeholder cards; count matches the plan count the API returns so the row width holds. */
  protected readonly shimmerCards = Array.from({ length: 4 });

  /** Stagger the card cascade, after the shimmer has collapsed. Capped so long lists don't drag. */
  protected cardEnterDelay(index: number): string {
    return `${200 + Math.min(index, 7) * 60}ms`;
  }

  ngOnInit(): void {
    this.store.load();
  }

  protected onPeriodChange(period: BillingPeriod): void {
    this.store.setPeriod(period);
  }

  protected onPlanSelect(plan: SubscriptionPlan): void {
    // Custom plans are quoted, not self-serve — the CTA reads "Talk to sales".
    if (plan.isCustom) {
      this.#document.defaultView?.location.assign(salesEnquiryMailto(plan.planName));
      return;
    }

    this.#router.navigate(['/auth/register-institution'], { queryParams: { planId: plan.id } });
  }
}
