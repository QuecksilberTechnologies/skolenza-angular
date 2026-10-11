import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ButtonModule } from '@openng/optimus-ui/button';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { catchError, forkJoin, map, of } from 'rxjs';

import { IndustriesApi, InstitutionsApi } from '@core/services';
import { StatusMessage } from '@shared/components/status-message/status-message';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { AvatarColor } from '@shared/directives';
import { SubscriptionPlan } from '@shared/interfaces';
import { CurrencySymbolPipe } from '@shared/pipes';

import { toPlanCompanies } from './subscription-plan-detail.model';
import { SubscriptionPlanStatusBadge } from './subscription-plan-status-badge';

@Component({
  selector: 'app-subscription-plan-detail',
  imports: [
    AvatarColor,
    ButtonModule,
    CurrencyPipe,
    CurrencySymbolPipe,
    DatePipe,
    DecimalPipe,
    SkeletonModule,
    SubscriptionPlanStatusBadge,
    StatusMessage,
    TableEmptyMessage,
  ],
  templateUrl: './subscription-plan-detail.html',
  // Optimus renders `#headless` content as a direct flex child of the drawer root, with no
  // `.p-drawer-content` wrapper — the host must claim the full height itself or the inner
  // `h-full` has nothing to resolve against and the body never scrolls.
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionPlanDetail {
  readonly #industriesApi = inject(IndustriesApi);
  readonly #institutionsApi = inject(InstitutionsApi);

  /** Required because the drawer only renders this component once a plan is selected. */
  readonly plan = input.required<SubscriptionPlan>();
  /** Owned by the caller — this panel stays presentational and reads no permission store. */
  readonly canEdit = input(false);
  readonly closePanel = output<void>();
  readonly editPlan = output<SubscriptionPlan>();

  readonly #companiesResource = rxResource({
    params: () => this.plan().id,
    stream: ({ params: subscriptionPlanId }) =>
      forkJoin({
        // Each stream catches on its own — `BaseService.handleError` rethrows, so an unguarded
        // forkJoin would blank the whole panel when either endpoint fails.
        subscriptions: this.#industriesApi
          .getInstitutionSubscriptionPlans({ SubscriptionPlanId: subscriptionPlanId })
          .pipe(catchError(() => of(null))),
        institutions: this.#institutionsApi.getInstitutions().pipe(catchError(() => of(null))),
      }).pipe(
        map(({ subscriptions, institutions }) => ({
          companies: toPlanCompanies(
            subscriptions?.data ?? [],
            institutions?.data ?? [],
            subscriptionPlanId,
          ),
          // `null` means the request threw. An `isSucceeded: false` envelope is the API's way of
          // saying "no subscribers", so it must not read as a failure.
          hasLoadFailed: subscriptions === null,
        })),
      ),
  });

  /**
   * A throw inside the mapping bypasses the per-stream guards and puts the resource in `error`,
   * where reading `value()` rethrows — so the status has to be checked before the value.
   */
  readonly #result = computed(() =>
    this.#companiesResource.status() === 'error'
      ? { companies: [], hasLoadFailed: true }
      : (this.#companiesResource.value() ?? { companies: [], hasLoadFailed: false }),
  );

  protected readonly isLoading = computed(() => this.#companiesResource.isLoading());
  protected readonly companies = computed(() => this.#result().companies);
  protected readonly hasLoadFailed = computed(() => this.#result().hasLoadFailed);

  /** Lapsed subscriptions stay in the list but are not counted as subscribers. */
  protected readonly subscriberCount = computed(
    () => this.companies().filter((company) => company.status !== 'Expired').length,
  );
  /** Same arithmetic as the grid's MRR column, so the two surfaces cannot disagree. */
  protected readonly estimatedMrr = computed(
    () => this.subscriberCount() * this.plan().monthlyPrice,
  );

  protected readonly currencyKey = computed(() => this.plan().currencyKey);
  protected readonly modules = computed(() => this.plan().modules ?? []);
  protected readonly pricingRows = computed(() => [
    { label: 'Per day', amount: this.plan().perDayPrice, srPeriod: 'per day' },
    { label: 'Monthly', amount: this.plan().monthlyPrice, srPeriod: 'per month' },
    { label: 'Yearly', amount: this.plan().yearlyPrice, srPeriod: 'per year' },
  ]);

  /** Ids are plan-scoped so a re-opened drawer never collides with a stale label reference. */
  protected readonly eyebrowId = computed(() => `plan-detail-eyebrow-${this.plan().id}`);
  protected readonly titleId = computed(() => `plan-detail-title-${this.plan().id}`);

  protected onClose() {
    this.closePanel.emit();
  }

  protected onEdit() {
    this.editPlan.emit(this.plan());
  }

  protected onRetry() {
    this.#companiesResource.reload();
  }
}
