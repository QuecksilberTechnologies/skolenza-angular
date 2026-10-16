import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputGroupModule } from '@openng/optimus-ui/inputgroup';
import { InputGroupAddonModule } from '@openng/optimus-ui/inputgroupaddon';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, map, of } from 'rxjs';

import { Common, HostBillingApi, SubscriptionsApi } from '@core/services';
import { CurrencyStore, LookupStore } from '@core/stores';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import {
  HostBillingCycle,
  HostPlanPrice,
  HostPlanPriceReq,
  SubscriptionPlan,
} from '@shared/interfaces';
import { fromDateKey, localDateKey } from '@shared/utilities/date-key';
import { showFieldError } from '@shared/utilities/field-error';

import { PlanPriceFormModel, planPriceFormSchema } from './plan-price-form.schema';

/** One page big enough to hold every plan — this feeds a dropdown, not a grid. */
const LOOKUP_PAGE_SIZE = 100;

const BILLING_CYCLES: { label: string; value: HostBillingCycle }[] = [
  { label: 'Monthly', value: 'Monthly' },
  { label: 'Yearly', value: 'Yearly' },
];

const emptyModel: PlanPriceFormModel = {
  subscriptionPlanId: null,
  countryCode: 'IN',
  currencyCode: 'INR',
  billingCycle: 'Monthly',
  baseAmount: null,
  effectiveFrom: null,
  effectiveTo: null,
  isActive: true,
};

@Component({
  selector: 'app-plan-price-form',
  imports: [
    FormField,
    ButtonModule,
    DatePickerModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    ToggleField,
    ToggleSwitchModule,
  ],
  templateUrl: './plan-price-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanPriceForm {
  readonly #hostBillingApi = inject(HostBillingApi);
  readonly #subscriptionsApi = inject(SubscriptionsApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #destroyRef = inject(DestroyRef);
  readonly #lookupStore = inject(LookupStore);
  readonly #currencyStore = inject(CurrencyStore);

  readonly #planPrice = this.#dynamicDialogConfig.data?.planPrice as HostPlanPrice | undefined;

  protected readonly billingCycles = BILLING_CYCLES;
  protected readonly isEditMode = !!this.#planPrice;
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<PlanPriceFormModel>(
    this.#planPrice
      ? this.#toModel(this.#planPrice)
      : // A new price most often starts today; the user can still move it.
        { ...emptyModel, effectiveFrom: fromDateKey(localDateKey()) },
  );

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, planPriceFormSchema);
  });

  protected readonly countryOptions = computed(() =>
    this.#lookupStore
      .countries()
      .map((c) => ({ label: `${c.countryName} (${c.countryCode})`, value: c.countryCode })),
  );
  protected readonly isLoadingCountries = this.#lookupStore.isLoadingCountries;
  /** The full label lists in the panel; the short one keeps the closed select from truncating. */
  protected readonly currencyOptions = computed(() =>
    this.#currencyStore.currencies().map((c) => ({
      label: `${c.code} - ${c.name} (${c.symbol})`,
      shortLabel: `${c.code} (${c.symbol})`,
      value: c.code,
    })),
  );
  protected readonly isLoadingCurrencies = this.#currencyStore.isLoading;

  /** Labels the amount so the figure is never read in the wrong currency. */
  protected readonly currencySymbol = computed(() => {
    const code = this.model().currencyCode;
    return this.#currencyStore.symbols()[code] ?? code;
  });

  /** Every plan, inactive included — an existing price may belong to a retired plan. */
  readonly #plansResource = rxResource({
    stream: () =>
      this.#subscriptionsApi
        .getHostSubscriptionPlans({ isActive: null, pageNumber: 1, pageSize: LOOKUP_PAGE_SIZE })
        .pipe(
          map((res) => {
            if (!res.isSucceeded) {
              this.#commonService.showMessage(res.message, 'error');
            }
            return res.isSucceeded ? (res.data ?? []) : [];
          }),
          catchError((err) => {
            this.#commonService.showMessage(err.message, 'error');
            return of([] as SubscriptionPlan[]);
          }),
        ),
  });

  protected readonly plans = computed(() => this.#plansResource.value() ?? []);
  protected readonly isLoadingPlans = computed(() => this.#plansResource.isLoading());

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  #toModel(row: HostPlanPrice): PlanPriceFormModel {
    return {
      subscriptionPlanId: row.subscriptionPlanId,
      countryCode: row.countryCode,
      currencyCode: row.currencyCode,
      billingCycle: row.billingCycle,
      baseAmount: row.baseAmount,
      effectiveFrom: fromDateKey(row.effectiveFrom),
      effectiveTo: fromDateKey(row.effectiveTo),
      isActive: row.isActive,
    };
  }

  onSubmit(): void {
    if (this.isSaving()) {
      return;
    }

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      const value = this.model();
      // The schema has already ruled out the nulls; the fallbacks only narrow the type.
      const body: HostPlanPriceReq = {
        subscriptionPlanId: value.subscriptionPlanId ?? 0,
        countryCode: value.countryCode.trim().toUpperCase(),
        currencyCode: value.currencyCode.trim().toUpperCase(),
        billingCycle: value.billingCycle,
        baseAmount: value.baseAmount ?? 0,
        effectiveFrom: value.effectiveFrom ? localDateKey(value.effectiveFrom) : '',
        effectiveTo: value.effectiveTo ? localDateKey(value.effectiveTo) : null,
        isActive: value.isActive,
      };

      this.isSaving.set(true);

      const request$ = this.#planPrice
        ? this.#hostBillingApi.updatePlanPrice(this.#planPrice.id, body)
        : this.#hostBillingApi.addPlanPrice(body);

      request$
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            // An overlapping active window comes back here as the API's own message.
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

  onCancel(): void {
    this.#dialogRef.close();
  }
}
