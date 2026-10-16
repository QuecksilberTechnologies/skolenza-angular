import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';
import { PasswordModule } from '@openng/optimus-ui/password';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { HostApi } from '@core/services/host-api';
import {
  HostUser,
  ResetHostUserPasswordForm,
  ResetHostUserPasswordRequest,
} from '@shared/interfaces';

@Component({
  selector: 'app-host-user-reset-password-dialog',
  imports: [ReactiveFormsModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './host-user-reset-password-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostUserResetPasswordDialog {
  readonly #commonService = inject(Common);
  readonly #hostApi = inject(HostApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);

  readonly minPasswordLength = 8;
  readonly maxPasswordLength = 20;
  protected resetPasswordForm!: FormGroup<ResetHostUserPasswordForm>;
  protected hostUser: HostUser;
  protected isSaving = signal(false);

  constructor() {
    this.hostUser = this.#dynamicDialogConfig.data.hostUser;
    this.initForm();
  }

  initForm() {
    this.resetPasswordForm = this.#fb.group(
      {
        newPassword: this.#fb.control('', [
          Validators.required,
          Validators.minLength(this.minPasswordLength),
          Validators.maxLength(this.maxPasswordLength),
        ]),
        confirmPassword: this.#fb.control('', Validators.required),
      },
      { validators: this.passwordMatchValidator },
    );
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword || !confirmPassword.value) {
      return null;
    }

    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  isInvalid(controlName: string) {
    const control = this.resetPasswordForm.get(controlName);
    return !!control?.invalid && control.touched;
  }

  onSubmit() {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const form = this.resetPasswordForm.getRawValue();
    const body: ResetHostUserPasswordRequest = {
      hostUserId: this.hostUser.id,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword,
    };

    this.isSaving.set(true);
    this.#hostApi
      .resetHostUserPassword(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close(res);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  onCancel() {
    this.#dialogRef.close();
  }
}
