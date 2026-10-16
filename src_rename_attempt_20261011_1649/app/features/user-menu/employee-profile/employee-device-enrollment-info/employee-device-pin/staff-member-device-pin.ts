import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type FieldTree,
  form,
  FormField,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { finalize } from 'rxjs';

import { Common, StaffMemberDeviceEnrollmentApi } from '@core/services';
import { StaffMemberDeviceEnrollmentRow } from '@shared/interfaces';
import { showFieldError } from '@shared/utilities/field-error';

import { StaffMemberDevicePinModel, staffMemberDevicePinSchema } from './staffMember-device-pin.schema';

/**
 * Sets the device-user PIN for one enrollment.
 *
 * Write-only throughout: nothing reads the PIN back, so the field opens empty even for an
 * enrollment that already has one, the model is cleared the moment the request is sent, and the
 * value is never logged or put in a toast.
 */
@Component({
  selector: 'app-staffMember-device-pin',
  imports: [FormField, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './staffMember-device-pin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberDevicePin {
  readonly #staffMemberDeviceEnrollmentApi = inject(StaffMemberDeviceEnrollmentApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  readonly #enrollment = this.#dialogConfig.data?.enrollment as StaffMemberDeviceEnrollmentRow;

  protected readonly deviceName = this.#enrollment?.deviceName ?? 'this device';
  protected readonly isSaving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly model = signal<StaffMemberDevicePinModel>({ pin: '' });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberDevicePinSchema);
  });

  protected showError<T>(field: FieldTree<T>): boolean {
    return showFieldError(field, this.submitted());
  }

  onSubmit(): void {
    if (this.isSaving() || !this.#enrollment) {
      return;
    }

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) {
      return;
    }

    submit(this.f, async () => {
      this.isSaving.set(true);

      const pin = this.model().pin.trim();
      // Held only for the length of the request: the model is emptied before the response lands.
      this.model.set({ pin: '' });

      this.#staffMemberDeviceEnrollmentApi
        .upsertStaffMemberDevicePin({ enrollmentId: this.#enrollment.id, pin })
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
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}
