import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoFocusModule } from '@openng/optimus-ui/autofocus';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { SelectModule } from '@openng/optimus-ui/select';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

import { Common, RolesApi } from '@core/services';
import { TrimInput } from '@shared/directives';
import { AddUpdateRoleRequest, Role, RoleForm } from '@shared/interfaces';
import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

@Component({
  selector: 'app-role-dialog',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    MessageModule,
    AutoFocusModule,
    TrimInput,
  ],
  templateUrl: './role-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDialog implements OnInit {
  readonly #rolesApi = inject(RolesApi);
  readonly #commonService = inject(Common);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #config = inject(DynamicDialogConfig);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly isSaving = signal(false);
  protected readonly roleTypes = this.#rolesApi.roleTypes;
  protected role?: Role;
  protected roleForm!: FormGroup<RoleForm>;

  readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  constructor() {
    this.initForm();
  }

  ngOnInit() {
    if (this.roleTypes().length === 0) {
      this.loadRoleTypeOptions();
    }

    const roleId = this.#config.data?.roleId;
    if (roleId) {
      this.role = this.#rolesApi.getRole(roleId);
      this.patchForm();
    }
  }

  loadRoleTypeOptions() {
    this.#rolesApi
      .getRoleTypeOptions()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (res) => {
          this.#rolesApi.setRoleTypes(res.isSucceeded ? res.data : []);
          if (!res.isSucceeded) {
            this.#commonService.showMessage(res.message, 'error');
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  initForm() {
    this.roleForm = this.#fb.group({
      roleName: [
        '',
        [Validators.required, Validators.minLength(3), Validators.pattern(LABEL_PATTERN)],
      ],
      roleType: this.#fb.control<number | null>(null, Validators.required),
      remark: ['', Validators.maxLength(250)],
      isActive: [true],
    });
  }

  patchForm() {
    this.roleForm.patchValue({
      roleName: this.role?.roleName,
      roleType: this.role?.roleType || null,
      remark: this.role?.remark || '',
      isActive: this.role?.isActive ?? true,
    });
  }

  isInvalid(controlName: string) {
    const control = this.roleForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSubmit() {
    const roleId = this.role?.id;
    const req = this.#buildRequest(roleId);
    const endpoint = roleId ? this.#rolesApi.updateRole(req) : this.#rolesApi.addRole(req);

    this.isSaving.set(true);
    endpoint
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            if (roleId) {
              this.#rolesApi.updateRoleSignal(req);
            } else {
              this.#rolesApi.addRoleSignal(req);
            }
            this.#dialogRef.close(res.data);
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

  #buildRequest(roleId?: number): AddUpdateRoleRequest {
    const formValue = this.roleForm.value;

    const req: AddUpdateRoleRequest = {
      roleName: formValue.roleName?.trim() || '',
      roleType: formValue.roleType ?? 0,
      remark: formValue.remark?.trim(),
      isActive: formValue.isActive ?? true,
    };

    if (roleId) {
      req.id = roleId;
    }

    return req;
  }
}
