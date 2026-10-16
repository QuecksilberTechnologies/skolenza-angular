import { formatNumber } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, FormField, submit, validateStandardSchema } from '@angular/forms/signals';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { Observable, finalize } from 'rxjs';

import { Common, SubscriptionsApi } from '@core/services';
import { CurrencyStore } from '@core/stores';
import { TrimInput } from '@shared/directives';
import {
  CreateSubscriptionPlanReq,
  SubscriptionMutationRes,
  SubscriptionPlan,
} from '@shared/interfaces';
import { normalizeCurrencyCode } from '@shared/utilities/currency';

import { SubscriptionPlanModel, subscriptionPlanSchema } from './subscription-plan-form.schema';

/** Illustrative amounts only — the symbol and grouping follow the selected currency. */
const PRICE_EXAMPLES = { perDay: 18, monthly: 349, yearly: 3999 };

@Component({
  selector: 'app-subscription-plan-form',
  imports: [
    FormField,
    TrimInput,
    AutoFocusModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    ToggleSwitchModule,
  ],
  templateUrl: './subscription-plan-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SubscriptionPlanForm {
  readonly #subscriptionsApi = inject(SubscriptionsApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #locale = inject(LOCALE_ID);
  readonly #currencyStore = inject(CurrencyStore);

  protected readonly plan: SubscriptionPlan | undefined;
  protected readonly isSaving = signal(false);

  protected readonly currencyOptions = this.#currencyStore.options;

  /** The numbers start null so their placeholders show; the schema keeps them from staying empty. */
  protected readonly model = signal<SubscriptionPlanModel>({
    planName: '',
    currencyKey: 'INR',
    maxUsers: null,
    perDayPrice: null,
    monthlyPrice: null,
    yearlyPrice: null,
    isFree: false,
    isMostPopular: false,
    isCustom: false,
    /** The list endpoint has no "all" mode, so this seeds from the status the grid is showing. */
    isActive: true,
  });

  /** Prefixes the price inputs. Unknown keys fall back to the raw key rather than assuming rupees. */
  protected readonly currencySymbol = computed(() => {
    const code = normalizeCurrencyCode(this.model().currencyKey);
    return code ? (this.#currencyStore.symbols()[code] ?? code) : this.model().currencyKey;
  });

  /**
   * The inputs render their prefix only once they hold a value, so the placeholder carries the
   * symbol itself. Grouping goes through `formatNumber` so the hints match the grid's currency
   * cells rather than inventing their own format.
   */
  protected readonly pricePlaceholders = computed(() => {
    const symbol = this.currencySymbol();
    const hint = (amount: number) =>
      `e.g. ${symbol} ${formatNumber(amount, this.#locale, '1.0-0')}`;

    return {
      perDay: hint(PRICE_EXAMPLES.perDay),
      monthly: hint(PRICE_EXAMPLES.monthly),
      yearly: hint(PRICE_EXAMPLES.yearly),
    };
  });

  protected readonly modules = computed(() => this.plan?.modules ?? []);

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, subscriptionPlanSchema);

    // A free plan has nothing to price, so the three amounts are locked at zero.
    disabled(p.perDayPrice, { when: ({ valueOf }) => valueOf(p.isFree) });
    disabled(p.monthlyPrice, { when: ({ valueOf }) => valueOf(p.isFree) });
    disabled(p.yearlyPrice, { when: ({ valueOf }) => valueOf(p.isFree) });
  });

  constructor() {
    this.plan = this.#dynamicDialogConfig.data?.plan;
    const isActive = this.#dynamicDialogConfig.data?.isActive ?? true;

    if (this.plan?.id) {
      this.model.set({
        planName: this.plan.planName ?? '',
        currencyKey: this.plan.currencyKey || 'INR',
        maxUsers: this.plan.maxUsers ?? null,
        perDayPrice: this.plan.perDayPrice ?? null,
        monthlyPrice: this.plan.monthlyPrice ?? null,
        yearlyPrice: this.plan.yearlyPrice ?? null,
        isFree: this.plan.isFree ?? false,
        isMostPopular: this.plan.isMostPopular ?? false,
        isCustom: this.plan.isCustom ?? false,
        isActive,
      });
    } else {
      this.model.update((m) => ({ ...m, isActive }));
    }

    effect(() => {
      if (!this.model().isFree) return;

      const { perDayPrice, monthlyPrice, yearlyPrice } = this.model();
      // Tested against 0 rather than falsiness: a blank price is null, and leaving it null would
      // fail the schema on a plan that has nothing to price, with the inputs disabled to fix it.
      // Bailing once all three are 0 is also what stops the write retriggering this effect.
      if (perDayPrice === 0 && monthlyPrice === 0 && yearlyPrice === 0) return;

      this.model.update((m) => ({ ...m, perDayPrice: 0, monthlyPrice: 0, yearlyPrice: 0 }));
    });
  }

  onSubmit() {
    // Enter submits natively, bypassing the disabled Save button, and the request is
    // fire-and-forget so `submit()`'s own re-entry guard has already cleared by then.
    if (this.isSaving()) {
      return;
    }

    submit(this.f, async () => {
      const value = this.model();
      // `submit()` only runs this once the form is valid, so the schema has already ruled out
      // the nulls — the fallbacks are here to narrow the type, not to cover a real case.
      const body: CreateSubscriptionPlanReq = {
        planName: value.planName.trim(),
        maxUsers: value.maxUsers ?? 0,
        isMostPopular: value.isMostPopular,
        isCustom: value.isCustom,
        currencyKey: value.currencyKey,
        perDayPrice: value.perDayPrice ?? 0,
        isFree: value.isFree,
        monthlyPrice: value.monthlyPrice ?? 0,
        yearlyPrice: value.yearlyPrice ?? 0,
        isActive: value.isActive,
      };

      const request$: Observable<SubscriptionMutationRes> = this.plan?.id
        ? this.#subscriptionsApi.updateSubscriptionPlan({ ...body, id: this.plan.id })
        : this.#subscriptionsApi.addSubscriptionPlan(body);

      this.isSaving.set(true);
      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#dialogRef.close(true);
            }
          },
          error: (err) => {
            this.#commonService.showMessage(err.message, 'error');
          },
        });
    });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
