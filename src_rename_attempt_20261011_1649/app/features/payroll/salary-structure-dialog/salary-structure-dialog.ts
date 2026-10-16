import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DividerModule } from '@openng/optimus-ui/divider';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputNumberModule } from '@openng/optimus-ui/inputnumber';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { SalaryComponent, SalaryStructure } from '@shared/interfaces';

@Component({
  selector: 'app-salary-structure-dialog',
  imports: [
    UserAvatar,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DividerModule,
    CurrencyPipe,
  ],
  templateUrl: './salary-structure-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryStructureDialog implements OnInit {
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dialogConfig = inject(DynamicDialogConfig);

  readonly componentTypes = [
    { label: 'Fixed', value: 'fixed' },
    { label: 'Percentage', value: 'percentage' },
  ];

  readonly structure = signal<SalaryStructure | null>(null);

  readonly earningsForm = this.#fb.array<FormGroup>([]);
  readonly deductionsForm = this.#fb.array<FormGroup>([]);

  readonly totalEarnings = computed(() => {
    const earnings = this.earningsForm.controls;
    return earnings.reduce((sum, ctrl) => sum + (ctrl.get('amount')?.value || 0), 0);
  });

  readonly totalDeductions = computed(() => {
    const deductions = this.deductionsForm.controls;
    return deductions.reduce((sum, ctrl) => sum + (ctrl.get('amount')?.value || 0), 0);
  });

  ngOnInit(): void {
    const data = this.#dialogConfig.data?.structure as SalaryStructure | undefined;
    if (data) {
      this.structure.set(data);
      data.components.earnings.forEach((c) => this.earningsForm.push(this.createComponentGroup(c)));
      data.components.deductions.forEach((c) =>
        this.deductionsForm.push(this.createComponentGroup(c)),
      );
    }
  }

  createComponentGroup(component?: SalaryComponent): FormGroup {
    return this.#fb.group({
      name: [component?.name ?? '', Validators.required],
      type: [component?.type ?? 'fixed', Validators.required],
      amount: [component?.amount ?? 0, [Validators.required, Validators.min(0)]],
      percentage: [component?.percentage ?? null],
      baseComponent: [component?.baseComponent ?? null],
    });
  }

  addEarning(): void {
    this.earningsForm.push(this.createComponentGroup());
  }

  addDeduction(): void {
    this.deductionsForm.push(this.createComponentGroup());
  }

  removeEarning(index: number): void {
    this.earningsForm.removeAt(index);
  }

  removeDeduction(index: number): void {
    this.deductionsForm.removeAt(index);
  }

  save(): void {
    if (this.earningsForm.invalid || this.deductionsForm.invalid) return;

    const current = this.structure();
    if (!current) return;

    const earnings = this.earningsForm.value as SalaryComponent[];
    const deductions = this.deductionsForm.value as SalaryComponent[];
    const grossSalary = earnings.reduce((s, c) => s + (c.amount || 0), 0);
    const totalDeductions = deductions.reduce((s, c) => s + (c.amount || 0), 0);

    const updated: SalaryStructure = {
      ...current,
      components: { earnings, deductions },
      grossSalary,
      totalDeductions,
      netSalary: grossSalary - totalDeductions,
    };

    this.#dialogRef.close(updated);
  }

  cancel(): void {
    this.#dialogRef.close(null);
  }
}
