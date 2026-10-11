import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { BadgeCheck, LucideAngularModule } from 'lucide-angular';

import { SubscriptionPlan } from '@shared/interfaces';
import { CurrencySymbolPipe } from '@shared/pipes';
import {
  FEATURE_PREVIEW_COUNT,
  plural,
  salesEnquiryMailto,
  yearlySavingPercent,
} from '@shared/utilities/subscription-plan';

@Component({
  selector: 'app-pricing-card',
  imports: [ButtonModule, CurrencyPipe, CurrencySymbolPipe, DecimalPipe, LucideAngularModule],
  templateUrl: './pricing-card.html',
  styleUrl: './pricing-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingCard {
  readonly subscriptionPlan = input.required<SubscriptionPlan>();
  readonly institutionSubscriptionId = input<number>();
  readonly planSelect = output<SubscriptionPlan>();
  readonly BadgeCheck = BadgeCheck;

  /** Both hosts `track plan.id`, so a different plan is a different instance — no reset needed. */
  protected readonly isFeaturesExpanded = signal(false);

  /** Screen-reader wording for the billing period. */
  readonly periodLabel = computed(() =>
    this.subscriptionPlan().period === '/ year' ? 'per year' : 'per month',
  );

  protected readonly isCurrentPlan = computed(
    () => this.institutionSubscriptionId() === this.subscriptionPlan().id,
  );

  protected readonly planNameId = computed(() => `plan-name-${this.subscriptionPlan().id}`);

  protected readonly featuresListId = computed(() => `plan-features-${this.subscriptionPlan().id}`);

  protected readonly visibleFeatures = computed(() => {
    const features = this.subscriptionPlan().features ?? [];
    return this.isFeaturesExpanded() ? features : features.slice(0, FEATURE_PREVIEW_COUNT);
  });

  protected readonly hiddenFeatureCount = computed(() =>
    Math.max(0, (this.subscriptionPlan().features?.length ?? 0) - FEATURE_PREVIEW_COUNT),
  );

  protected readonly disclosureLabel = computed(() => {
    const hidden = this.hiddenFeatureCount();
    return this.isFeaturesExpanded() ? 'Show less' : `+ ${hidden} more ${plural(hidden, 'module')}`;
  });

  /** A plan can arrive with no modules at all — the card then offers a contact route instead. */
  protected readonly hasModules = computed(
    () => (this.subscriptionPlan().modules?.length ?? 0) > 0,
  );

  protected readonly salesMailto = computed(() =>
    salesEnquiryMailto(this.subscriptionPlan().planName),
  );

  /** Only claimed while yearly is selected, and only when yearly is genuinely cheaper. */
  protected readonly yearlySaving = computed(() => {
    const plan = this.subscriptionPlan();
    return plan.period === '/ year' ? yearlySavingPercent(plan) : null;
  });

  /** One CTA, three states — keeping them in one place stops the variants drifting apart. */
  protected readonly cta = computed(() => {
    const plan = this.subscriptionPlan();

    if (this.isCurrentPlan()) {
      return {
        severity: 'success' as const,
        label: 'Current Plan',
        ariaLabel: `Current plan: ${plan.planName}`,
        disabled: true,
      };
    }

    if (plan.isCustom) {
      return {
        severity: 'warn' as const,
        label: 'Talk to sales',
        ariaLabel: `Talk to sales about the ${plan.planName} plan`,
        disabled: false,
      };
    }

    const period = plan.period === '/ year' ? 'per year' : 'per month';
    return {
      severity: 'primary' as const,
      label: 'Get Started',
      ariaLabel: `Get started with ${plan.planName}, ${plan.price ?? 0} ${plan.currencyKey} ${period}`,
      disabled: false,
    };
  });

  protected subModuleWord(count: number): string {
    return plural(count, 'sub-module');
  }

  protected toggleFeatures(): void {
    this.isFeaturesExpanded.update((expanded) => !expanded);
  }

  onPlanSelect(subscriptionPlan: SubscriptionPlan) {
    this.planSelect.emit(subscriptionPlan);
  }
}
