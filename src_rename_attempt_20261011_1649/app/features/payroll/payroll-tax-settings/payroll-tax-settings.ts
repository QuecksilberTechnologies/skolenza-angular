import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TagModule } from '@openng/optimus-ui/tag';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { SectionCard } from '@shared/components/section-card/section-card';

import { TaxSlab, TaxSlabTable } from './tax-slab-table/tax-slab-table';
import { SurchargeSlab, TaxSurchargeTable } from './tax-surcharge-table/tax-surcharge-table';

type TaxRegime = 'new' | 'old';

interface TaxSettingsForm {
  defaultRegime: FormControl<TaxRegime>;
  healthEducationCess: FormControl<number>;
  professionalTaxAnnual: FormControl<number>;

  // New Regime
  newStandardDeduction: FormControl<number>;
  newRebateIncomeLimit: FormControl<number>;
  newRebateMaxAmount: FormControl<number>;

  // Old Regime
  oldStandardDeduction: FormControl<number>;
  oldRebateIncomeLimit: FormControl<number>;
  oldRebateMaxAmount: FormControl<number>;
  deduction80C: FormControl<number>;
  deduction80D: FormControl<number>;
  deduction80CCD1B: FormControl<number>;
  deductionSection24: FormControl<number>;
  allowHraExemption: FormControl<boolean>;
  allowLtaExemption: FormControl<boolean>;
}

@Component({
  selector: 'app-payroll-tax-settings',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    SectionCard,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    TaxSlabTable,
    TaxSurchargeTable,
    TagModule,
    ToggleSwitchModule,
    TooltipModule,
    MessageModule,
  ],
  templateUrl: './payroll-tax-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PayrollTaxSettings {
  readonly #commonService = inject(Common);
  readonly #fb = inject(NonNullableFormBuilder);

  protected readonly isSaving = signal(false);

  readonly regimeOptions = [
    { label: 'New Regime (Default from FY 2023-24)', value: 'new' as TaxRegime },
    { label: 'Old Regime', value: 'old' as TaxRegime },
  ];

  readonly newRegimeSlabs: TaxSlab[] = [
    { from: 0, to: 300000, rate: 0, label: 'Up to ₹3,00,000' },
    { from: 300001, to: 700000, rate: 5, label: '₹3,00,001 – ₹7,00,000' },
    { from: 700001, to: 1000000, rate: 10, label: '₹7,00,001 – ₹10,00,000' },
    { from: 1000001, to: 1200000, rate: 15, label: '₹10,00,001 – ₹12,00,000' },
    { from: 1200001, to: 1500000, rate: 20, label: '₹12,00,001 – ₹15,00,000' },
    { from: 1500001, to: null, rate: 30, label: 'Above ₹15,00,000' },
  ];

  readonly oldRegimeSlabs: TaxSlab[] = [
    { from: 0, to: 250000, rate: 0, label: 'Up to ₹2,50,000' },
    { from: 250001, to: 500000, rate: 5, label: '₹2,50,001 – ₹5,00,000' },
    { from: 500001, to: 1000000, rate: 20, label: '₹5,00,001 – ₹10,00,000' },
    { from: 1000001, to: null, rate: 30, label: 'Above ₹10,00,000' },
  ];

  readonly newRegimeSurcharge: SurchargeSlab[] = [
    { threshold: '₹50 lakh – ₹1 crore', rate: 10 },
    { threshold: '₹1 crore – ₹2 crore', rate: 15 },
    { threshold: 'Above ₹2 crore', rate: 25 },
  ];

  readonly oldRegimeSurcharge: SurchargeSlab[] = [
    { threshold: '₹50 lakh – ₹1 crore', rate: 10 },
    { threshold: '₹1 crore – ₹2 crore', rate: 15 },
    { threshold: '₹2 crore – ₹5 crore', rate: 25 },
    { threshold: 'Above ₹5 crore', rate: 37 },
  ];

  protected readonly form: FormGroup<TaxSettingsForm> = this.#fb.group({
    defaultRegime: this.#fb.control<TaxRegime>('new'),
    healthEducationCess: this.#fb.control(4, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    professionalTaxAnnual: this.#fb.control(2500, [Validators.required, Validators.min(0)]),

    newStandardDeduction: this.#fb.control(75000, [Validators.required, Validators.min(0)]),
    newRebateIncomeLimit: this.#fb.control(700000, [Validators.required, Validators.min(0)]),
    newRebateMaxAmount: this.#fb.control(25000, [Validators.required, Validators.min(0)]),

    oldStandardDeduction: this.#fb.control(50000, [Validators.required, Validators.min(0)]),
    oldRebateIncomeLimit: this.#fb.control(500000, [Validators.required, Validators.min(0)]),
    oldRebateMaxAmount: this.#fb.control(12500, [Validators.required, Validators.min(0)]),
    deduction80C: this.#fb.control(150000, [Validators.required, Validators.min(0)]),
    deduction80D: this.#fb.control(25000, [Validators.required, Validators.min(0)]),
    deduction80CCD1B: this.#fb.control(50000, [Validators.required, Validators.min(0)]),
    deductionSection24: this.#fb.control(200000, [Validators.required, Validators.min(0)]),
    allowHraExemption: this.#fb.control(true),
    allowLtaExemption: this.#fb.control(true),
  });

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#commonService.showMessage('Please fix the highlighted fields.', 'warn');
      return;
    }

    this.isSaving.set(true);
    // TODO: wire up to backend once /TaxSettings API is available.
    setTimeout(() => {
      this.isSaving.set(false);
      this.#commonService.showMessage('Tax settings saved successfully.', 'success');
    }, 400);
  }

  onReset(): void {
    this.form.reset({
      defaultRegime: 'new',
      healthEducationCess: 4,
      professionalTaxAnnual: 2500,
      newStandardDeduction: 75000,
      newRebateIncomeLimit: 700000,
      newRebateMaxAmount: 25000,
      oldStandardDeduction: 50000,
      oldRebateIncomeLimit: 500000,
      oldRebateMaxAmount: 12500,
      deduction80C: 150000,
      deduction80D: 25000,
      deduction80CCD1B: 50000,
      deductionSection24: 200000,
      allowHraExemption: true,
      allowLtaExemption: true,
    });
    this.#commonService.showMessage('Tax settings reset to defaults.', 'info');
  }
}
