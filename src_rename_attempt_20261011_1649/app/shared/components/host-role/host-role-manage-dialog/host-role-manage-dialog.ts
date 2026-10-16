import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { finalize } from 'rxjs';

import { Common } from '@core/services/common';
import { HostApi } from '@core/services/host-api';
import { TrimInput } from '@shared/directives';
import {
  CreateHostRoleRequest,
  HostRole,
  HostRoleForm,
  UpdateHostRoleRequest,
} from '@shared/interfaces';
import { PERSON_NAME_PATTERN } from '@shared/utilities/validation-regex';

@Component({
  selector: 'app-host-role-manage-dialog',
  imports: [
    ReactiveFormsModule,
    AutoFocusModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    ButtonModule,
    MessageModule,
    TrimInput,
  ],
  templateUrl: './host-role-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HostRoleManageDialog {
  readonly #commonService = inject(Common);
  readonly #hostApi = inject(HostApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);

  readonly maxDescriptionLength = 200;
  protected hostRoleForm!: FormGroup<HostRoleForm>;
  protected hostRole?: HostRole;
  protected isSaving = signal(false);

  constructor() {
    this.hostRole = this.#dynamicDialogConfig.data?.hostRole;
    this.initForm();

    if (this.hostRole?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.hostRoleForm = this.#fb.group<HostRoleForm>({
      name: this.#fb.control('', [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(PERSON_NAME_PATTERN),
      ]),
      description: this.#fb.control('', [
        Validators.required,
        Validators.maxLength(this.maxDescriptionLength),
      ]),
      isActive: this.#fb.control(true),
    });
  }

  patchForm() {
    this.hostRoleForm.patchValue({
      name: this.hostRole?.name,
      description: this.hostRole?.description,
      isActive: this.hostRole?.isActive ?? true,
    });
  }

  isInvalid(controlName: string) {
    const control = this.hostRoleForm.get(controlName);
    return !!control?.invalid && control.touched;
  }

  onSubmit() {
    if (this.hostRoleForm.invalid) {
      this.hostRoleForm.markAllAsTouched();
      return;
    }

    if (this.hostRole?.id) {
      this.updateHostRole();
    } else {
      this.createHostRole();
    }
  }

  createHostRole() {
    const form = this.hostRoleForm.getRawValue();

    // `create-host-role` has no isActive field; new roles are created active.
    const body: CreateHostRoleRequest = {
      name: form.name.trim(),
      description: form.description.trim(),
    };

    this.isSaving.set(true);
    this.#hostApi
      .createHostRole(body)
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

  updateHostRole() {
    const form = this.hostRoleForm.getRawValue();

    const body: UpdateHostRoleRequest = {
      id: this.hostRole!.id,
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
    };

    this.isSaving.set(true);
    this.#hostApi
      .updateHostRole(body)
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
