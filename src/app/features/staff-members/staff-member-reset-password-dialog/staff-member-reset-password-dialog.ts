import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffMembersApi } from '@core/services';
import { FormPassword } from '@shared/components/form-inputs/form-password/form-password';
import { IStaffMember } from '@shared/interfaces';

import {
  StaffMemberResetPasswordModel,
  staffMemberResetPasswordSchema,
} from './staff-member-reset-password-dialog.schema';

const emptyModel: StaffMemberResetPasswordModel = { newPassword: '', confirmPassword: '' };

/**
 * Sets a new login password for another staffMember.
 *
 * `moduleId` / `operationId` are not sent from here: `moduleOperationInterceptor` resolves them
 * for `POST /Staff/reset-password` off its row in `MODULE_OPERATION_ROUTES`.
 */
@Component({
  selector: 'app-staff-member-reset-password-dialog',
  imports: [ButtonModule, FormPassword],
  templateUrl: './staff-member-reset-password-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberResetPasswordDialog {
  readonly #staffMembersApi = inject(StaffMembersApi);
  readonly #commonService = inject(Common);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly staffMember = this.#dialogConfig.data?.staffMember as IStaffMember;

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<StaffMemberResetPasswordModel>({ ...emptyModel });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffMemberResetPasswordSchema);
  });

  protected get staffMemberName(): string {
    return [this.staffMember?.firstName, this.staffMember?.middleName, this.staffMember?.lastName]
      .filter(Boolean)
      .join(' ');
  }

  onSubmit(): void {
    if (this.isSaving()) return;

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) return;

    const staffMemberId = this.staffMember?.staffMemberId;
    if (!staffMemberId) {
      this.#commonService.showMessage('No staffMember selected.', 'error');
      return;
    }

    submit(this.f, async () => {
      const { newPassword, confirmPassword } = this.model();
      this.isSaving.set(true);

      this.#staffMembersApi
        .resetStaffMemberPassword({ staffMemberId, newPassword, confirmPassword })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) this.#dialogRef.close(true);
          },
          error: (err) => this.#commonService.showMessage(err.message, 'error'),
        });
    });
  }

  onCancel(): void {
    this.#dialogRef.close();
  }
}

