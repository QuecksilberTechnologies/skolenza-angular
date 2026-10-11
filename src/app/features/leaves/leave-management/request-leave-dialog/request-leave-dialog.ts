import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { LucideAngularModule } from 'lucide-angular';

import { ILeaveDuration } from '@shared/interfaces';
import { dateRangeValidator } from '@shared/validators/date-range.validator';

import { LeaveStore } from '../../leave.store';

@Component({
  selector: 'app-request-leave-dialog',
  imports: [
    ButtonModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    MessageModule,
    ReactiveFormsModule,
    LucideAngularModule,
  ],
  templateUrl: './request-leave-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RequestLeaveDialog {
  readonly #leaveStore = inject(LeaveStore);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #fb = inject(FormBuilder);
  readonly leaveTypeCards = this.#leaveStore.leaveTypeCards;
  protected leaveDurations = signal<ILeaveDuration[]>([]);
  protected isSaving = signal<boolean>(false);
  protected balanceError = signal<string | null>(null);

  protected leaveRequestForm = this.#fb.group(
    {
      leaveType: [null as number | null, [Validators.required]],
      startDate: [null as Date | null, [Validators.required]],
      endDate: [null as Date | null, [Validators.required]],
      duration: ['', [Validators.required]],
      reason: ['', [Validators.required]],
      document: [''],
    },
    { validators: dateRangeValidator('startDate', 'endDate') },
  );

  protected get hasDateRangeError(): boolean {
    return this.leaveRequestForm.errors?.['dateRange'] === true;
  }

  constructor() {
    this.leaveDurations.set(this.#leaveStore.leaveDurations);
  }

  isInvalid(controlName: string) {
    const control = this.leaveRequestForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSubmit() {
    this.balanceError.set(null);
    this.leaveRequestForm.markAllAsTouched();
    if (this.leaveRequestForm.invalid) return;

    const value = this.leaveRequestForm.getRawValue();
    const startDate = value.startDate as Date;
    const endDate = value.endDate as Date;
    const daysCount = this.#leaveStore.getLeaveDaysCount({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (daysCount <= 0) {
      this.balanceError.set('End date must be on or after start date.');
      return;
    }

    const card = this.leaveTypeCards().find((c) => c.id === value.leaveType);
    const available = card?.available ?? 0;
    if (card && available - daysCount < 0) {
      this.balanceError.set(
        `Insufficient ${card.name} balance — requested ${daysCount} day(s), available ${available}.`,
      );
      return;
    }

    this.isSaving.set(true);
    this.#leaveStore.submitLeaveRequest({
      leaveTypeId: value.leaveType as number,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration: value.duration ?? '',
      reason: value.reason ?? '',
      documentUrl: value.document || null,
    });
    this.isSaving.set(false);
    this.#dialogRef.close(true);
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
