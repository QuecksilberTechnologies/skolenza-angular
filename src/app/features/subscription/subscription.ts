import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SelectButtonModule } from '@openng/optimus-ui/selectbutton';

import { PricingCard } from '@shared/components/pricing/pricing-card/pricing-card';

import { CurrentPlanCard } from './current-plan-card/current-plan-card';
import { InvoicesTable } from './invoices-table/invoices-table';
import { PaymentMethodCard } from './payment-method-card/payment-method-card';
import { BillingPeriod, SubscriptionStore } from './subscription.store';

@Component({
  selector: 'app-subscription',
  imports: [
    ButtonModule,
    FormsModule,
    SelectButtonModule,
    PricingCard,
    CurrentPlanCard,
    PaymentMethodCard,
    InvoicesTable,
  ],
  templateUrl: './subscription.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SubscriptionStore],
})
export default class Subscription implements OnInit {
  protected readonly store = inject(SubscriptionStore);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  private readonly plansHeading = viewChild<ElementRef<HTMLElement>>('plansHeading');

  protected readonly periodOptions = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
  ];

  ngOnInit(): void {
    // Deep-link the billing period so reload/back/share preserves the choice.
    const period = this.#route.snapshot.queryParamMap.get('period');
    if (period === 'monthly' || period === 'yearly') this.store.setPeriod(period);
    this.store.load();
  }

  onPeriodChange(period: BillingPeriod): void {
    this.store.setPeriod(period);
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { period },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // Scroll the pricing section into view and move focus to its heading.
  scrollToPlans(): void {
    const el = this.plansHeading()?.nativeElement;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }
}
