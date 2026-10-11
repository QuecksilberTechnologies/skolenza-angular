import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { PasswordModule } from '@openng/optimus-ui/password';
import { SelectModule } from '@openng/optimus-ui/select';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, finalize, map, of } from 'rxjs';

import { Common } from '@core/services/common';
import { HostApi } from '@core/services/host-api';
import { TrimInput } from '@shared/directives';
import {
  CreateHostUserRequest,
  HostUser,
  HostUserForm,
  UpdateHostUserRequest,
} from '@shared/interfaces';
import { EMAIL_PATTERN, PERSON_NAME_PATTERN } from '@shared/utilities/validation-regex';
import { contactNumberValidator } from '@shared/validators/contact.validators';

@Component({
  selector: 'app-host-user-manage-dialog',
  imports: [
    ReactiveFormsModule,
    AutoFocusModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ToggleSwitchModule,
    ButtonModule,
    MessageModule,
    TrimInput,
  ],
  templateUrl: './host-user-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostUserManageDialog {
  readonly #commonService = inject(Common);
  readonly #hostApi = inject(HostApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);

  readonly minPasswordLength = 8;
  readonly maxPasswordLength = 20;
  protected hostUserForm!: FormGroup<HostUserForm>;
  protected hostUser?: HostUser;
  protected isSaving = signal(false);

  protected readonly hostRolesResource = rxResource({
    stream: () =>
      this.#hostApi.getHostRoles().pipe(
        map((res) => {
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
            return [];
          }
          return res.data ?? [];
        }),
        // `handleError` rethrows; an errored resource makes `value()` throw, which aborts
        // change detection for the whole view — not just this control.
        catchError((err) => {
          this.#commonService.showMessage(err.message, 'error');
          return of([]);
        }),
      ),
    defaultValue: [],
  });

  constructor() {
    this.hostUser = this.#dynamicDialogConfig.data?.hostUser;
    this.initForm();

    if (this.hostUser?.id) {
      this.patchForm();
    }
  }

  initForm() {
    const isEdit = !!this.hostUser?.id;

    this.hostUserForm = this.#fb.group<HostUserForm>({
      name: this.#fb.control('', [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(PERSON_NAME_PATTERN),
      ]),
      // Host logins are email addresses; the login ID cannot be changed after creation.
      loginId: this.#fb.control({ value: '', disabled: isEdit }, [
        Validators.required,
        Validators.pattern(EMAIL_PATTERN),
      ]),
      email: this.#fb.control('', [Validators.required, Validators.pattern(EMAIL_PATTERN)]),
      mobileNumber: this.#fb.control('', [Validators.required, contactNumberValidator('IN')]),
      hostRoleId: this.#fb.control<number | null>(null, Validators.required),
      // Password is only set at creation; use Reset password for an existing user.
      password: this.#fb.control({ value: '', disabled: isEdit }, [
        Validators.required,
        Validators.minLength(this.minPasswordLength),
        Validators.maxLength(this.maxPasswordLength),
      ]),
      isActive: this.#fb.control(true),
    });
  }

  patchForm() {
    this.hostUserForm.patchValue({
      name: this.hostUser?.name,
      loginId: this.hostUser?.loginId,
      email: this.hostUser?.email,
      mobileNumber: this.hostUser?.mobileNumber,
      hostRoleId: this.hostUser?.hostRoleId ?? null,
      isActive: this.hostUser?.isActive ?? true,
    });
  }

  isInvalid(controlName: string) {
    const control = this.hostUserForm.get(controlName);
    return !!control?.invalid && control.touched;
  }

  onSubmit() {
    if (this.hostUserForm.invalid) {
      this.hostUserForm.markAllAsTouched();
      return;
    }

    if (this.hostUser?.id) {
      this.updateHostUser();
    } else {
      this.createHostUser();
    }
  }

  createHostUser() {
    const form = this.hostUserForm.getRawValue();

    const body: CreateHostUserRequest = {
      hostRoleId: form.hostRoleId as number,
      name: form.name.trim(),
      loginId: form.loginId.trim(),
      password: form.password,
      email: form.email.trim(),
      mobileNumber: form.mobileNumber.replace(/\s/g, ''),
      isActive: form.isActive,
    };

    this.isSaving.set(true);
    this.#hostApi
      .createHostUser(body)
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

  updateHostUser() {
    const form = this.hostUserForm.getRawValue();

    const body: UpdateHostUserRequest = {
      id: this.hostUser!.id,
      hostRoleId: form.hostRoleId as number,
      name: form.name.trim(),
      loginId: form.loginId.trim(),
      email: form.email.trim(),
      mobileNumber: form.mobileNumber.replace(/\s/g, ''),
      isActive: form.isActive,
    };

    this.isSaving.set(true);
    this.#hostApi
      .updateHostUser(body)
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
