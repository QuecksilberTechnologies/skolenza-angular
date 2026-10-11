import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import {
  disabled,
  type FieldTree,
  form,
  FormField,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { SkeletonModule } from '@openng/optimus-ui/skeleton';
import { TagModule } from '@openng/optimus-ui/tag';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';

import { CanComponentDeactivate } from '@core/guards';
import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import { HOST_BILLING_MODULE, HostBillingConfiguration } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import {
  BILLING_COUNTRY_CODES,
  BillingConfigurationModel,
  billingConfigurationSchema,
} from './billing-configuration.schema';
import { BillingConfigurationStore } from './billing-configuration.store';

const EMPTY_MODEL: BillingConfigurationModel = {
  sellerLegalName: '',
  sellerBillingEmail: '',
  sellerBillingPhone: '',
  countryCode: 'IN',
  stateCode: '',
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
  taxRegistrationNumber: '',
  invoicePrefix: '',
  paymentRetryCount: null,
  gracePeriodDays: null,
  paymentTimeoutMinutes: null,
  reconciliationLookbackDays: null,
  isActive: false,
};

/** The read returns nullable seller fields on an unconfigured seed; the inputs want strings. */
function toModel(config: HostBillingConfiguration): BillingConfigurationModel {
  return {
    sellerLegalName: config.sellerLegalName ?? '',
    sellerBillingEmail: config.sellerBillingEmail ?? '',
    sellerBillingPhone: config.sellerBillingPhone ?? '',
    countryCode: BILLING_COUNTRY_CODES.find((code) => code === config.countryCode) ?? 'IN',
    stateCode: config.stateCode ?? '',
    postalCode: config.postalCode ?? '',
    addressLine1: config.addressLine1 ?? '',
    addressLine2: config.addressLine2 ?? '',
    taxRegistrationNumber: config.taxRegistrationNumber ?? '',
    invoicePrefix: config.invoicePrefix ?? '',
    paymentRetryCount: config.paymentRetryCount,
    gracePeriodDays: config.gracePeriodDays,
    paymentTimeoutMinutes: config.paymentTimeoutMinutes,
    reconciliationLookbackDays: config.reconciliationLookbackDays,
    isActive: config.isActive,
  };
}

/**
 * The Host's seller, GST, invoice and payment-retry settings — one record, edited in place.
 *
 * Gateway credentials never reach the browser: the API returns only whether each is set, and this
 * page shows exactly that.
 */
@Component({
  selector: 'app-billing-configuration',
  imports: [
    FormField,
    ButtonModule,
    CardModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    ToggleSwitchModule,
    ToggleField,
  ],
  providers: [BillingConfigurationStore],
  templateUrl: './billing-configuration.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BillingConfiguration implements CanComponentDeactivate {
  readonly #commonService = inject(Common);
  readonly #featurePageStore = inject(FeaturePageStore);

  readonly store = inject(BillingConfigurationStore);

  protected readonly moduleCode = HOST_BILLING_MODULE.configuration;
  protected readonly countryOptions = [{ value: 'IN', label: 'India' }];

  protected readonly canUpdate = computed(() =>
    this.#featurePageStore.canPerform(this.moduleCode, 'Update'),
  );

  /** What the server holds, so leaving the page can tell an edit from a fresh load. Follows the
   *  record, so a save or a conflict reload moves it too. */
  readonly #baseline = computed(() => {
    const config = this.store.configuration();
    return config ? toModel(config) : { ...EMPTY_MODEL };
  });
  /** Editable copy of the baseline; a new record re-seeds it and drops any edits. */
  protected readonly model = linkedSignal(() => ({ ...this.#baseline() }));
  /** Error display resets with every new record. */
  protected readonly submitted = linkedSignal({ source: this.#baseline, computation: () => false });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, billingConfigurationSchema);
    disabled(p, { when: () => !this.canUpdate() || this.store.isSaving() });
  });

  protected readonly isDirty = computed(
    () => JSON.stringify(this.model()) !== JSON.stringify(this.#baseline()),
  );

  protected readonly credentials = computed(() => {
    const config = this.store.configuration();
    return [
      { label: 'Client ID', isSet: !!config?.hasClientId },
      { label: 'Client secret', isSet: !!config?.hasClientSecret },
      { label: 'Webhook secret', isSet: !!config?.hasWebhookSecret },
    ];
  });

  constructor() {
    effect(() =>
      this.#commonService.setPageHeaderInfo({
        pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Billing Configuration',
        pageDescription: 'Seller identity, GST and payment retry settings used on every invoice.',
        pageIcon: 'pi pi-cog',
        isBreadcrumbShow: false,
      }),
    );
  }

  canDeactivate(): boolean {
    return !this.isDirty();
  }

  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  protected onSave(): void {
    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid() || !this.canUpdate()) return;

    const value = this.model();
    this.store.save({
      sellerLegalName: value.sellerLegalName.trim(),
      sellerBillingEmail: value.sellerBillingEmail.trim(),
      sellerBillingPhone: value.sellerBillingPhone.trim() || null,
      countryCode: value.countryCode,
      stateCode: value.stateCode.trim(),
      postalCode: value.postalCode.trim(),
      addressLine1: value.addressLine1.trim(),
      addressLine2: value.addressLine2.trim() || null,
      taxRegistrationNumber: value.taxRegistrationNumber.trim().toUpperCase(),
      invoicePrefix: value.invoicePrefix.trim(),
      // The schema has already rejected nulls.
      paymentRetryCount: value.paymentRetryCount as number,
      gracePeriodDays: value.gracePeriodDays as number,
      paymentTimeoutMinutes: value.paymentTimeoutMinutes as number,
      reconciliationLookbackDays: value.reconciliationLookbackDays as number,
      isActive: value.isActive,
    });
  }

  /** Throws the edits away and goes back to what the server holds. */
  protected onDiscard(): void {
    this.model.set({ ...this.#baseline() });
    this.submitted.set(false);
  }
}
