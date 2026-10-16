import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common, HostBillingApi } from '@core/services';
import { ToggleField } from '@shared/components/toggle-field/toggle-field';
import { HostTaxRule, HostTaxRuleReq } from '@shared/interfaces';
import { fromDateKey, localDateKey } from '@shared/utilities/date-key';
import { showFieldError } from '@shared/utilities/field-error';

import { TaxRuleFormModel, taxRuleFormSchema } from './tax-rule-form.schema';

const emptyModel: TaxRuleFormModel = {
  countryCode: 'IN',
  taxCode: '',
  taxName: '',
  ratePercent: null,
  effectiveFrom: null,
  effectiveTo: null,
  isActive: true,
  configurationJson: '',
};

@Component({
  selector: 'app-tax-rule-form',
  imports: [
    FormField,
    AutoFocusModule,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    TextareaModule,
    ToggleField,
    ToggleSwitchModule,
  ],
  templateUrl: './tax-rule-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxRuleForm {
  readonly #hostBillingApi = inject(HostBillingApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #destroyRef = inject(DestroyRef);

  readonly #taxRule = this.#dynamicDialogConfig.data?.taxRule as HostTaxRule | undefined;

  protected readonly configurationExample = '{"splitByPlaceOfSupply": true}';
  protected readonly isEditMode = !!this.#taxRule;
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<TaxRuleFormModel>(
    this.#taxRule ? this.#toModel(this.#taxRule) : emptyModel,
  );

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, taxRuleFormSchema);
  });

  /** Templates call this per field; the rule itself lives in `@shared/utilities/field-error`. */
  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  /** `pTextarea` subscribes to `ngControl.valueChanges`, which Signal Forms does not provide, so the
   *  configuration field is bound by hand instead of through `[formField]`. */
  onConfigurationInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.model.update((m) => ({ ...m, configurationJson: value }));
    this.f.configurationJson().markAsDirty();
    this.f.configurationJson().markAsTouched();
  }

  #toModel(row: HostTaxRule): TaxRuleFormModel {
    return {
      countryCode: row.countryCode,
      taxCode: row.taxCode,
      taxName: row.taxName,
      ratePercent: row.ratePercent,
      effectiveFrom: fromDateKey(row.effectiveFrom),
      effectiveTo: fromDateKey(row.effectiveTo),
      isActive: row.isActive,
      configurationJson: row.configurationJson ?? '',
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
      const body: HostTaxRuleReq = {
        countryCode: value.countryCode.trim().toUpperCase(),
        taxCode: value.taxCode.trim(),
        taxName: value.taxName.trim(),
        ratePercent: value.ratePercent ?? 0,
        effectiveFrom: value.effectiveFrom ? localDateKey(value.effectiveFrom) : '',
        effectiveTo: value.effectiveTo ? localDateKey(value.effectiveTo) : null,
        isActive: value.isActive,
        configurationJson: value.configurationJson.trim() || null,
      };

      this.isSaving.set(true);

      const request$ = this.#taxRule
        ? this.#hostBillingApi.updateTaxRule(this.#taxRule.id, body)
        : this.#hostBillingApi.addTaxRule(body);

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
