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

import { Common } from '@core/services/common';
import { DepartmentsApi } from '@core/services/departments-api';
import { LookupStore } from '@core/stores';
import { TrimInput } from '@shared/directives';
import {
  AddDepartmentRequest,
  Department,
  DepartmentForm,
  LoginInfo,
  UpdateDepartmentRequest,
} from '@shared/interfaces';
import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

@Component({
  selector: 'app-department-manage-dialog',
  imports: [
    ReactiveFormsModule,
    AutoFocusModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    MessageModule,
    TrimInput,
  ],
  templateUrl: './department-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentManageDialog implements OnInit {
  readonly #commonService = inject(Common);
  readonly #departmentsApi = inject(DepartmentsApi);
  readonly #lookupStore = inject(LookupStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);
  protected departmentForm!: FormGroup<DepartmentForm>;
  protected department!: Department;
  protected loginInfo!: LoginInfo;
  protected isSaving = signal(false);

  readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  constructor() {
    this.department = this.#dynamicDialogConfig.data.department;
    this.initForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    if (this.department?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.departmentForm = this.#fb.group({
      departmentName: [
        '',
        [Validators.required, Validators.minLength(3), Validators.pattern(LABEL_PATTERN)],
      ],
      description: ['', Validators.maxLength(250)],
      remark: ['', Validators.maxLength(250)],
      isActive: [true],
    });
  }

  patchForm() {
    this.departmentForm.patchValue({
      departmentName: this.department?.departmentName,
      description: this.department?.description,
      remark: this.department?.remark ?? '',
      isActive: this.department?.isActive ?? true,
    });
  }

  isInvalid(controlName: string) {
    const control = this.departmentForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async onSubmit() {
    if (this.department?.id) {
      this.updateDepartment();
    } else {
      this.addDepartment();
    }
  }

  addDepartment() {
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;
    const form = this.departmentForm.value;

    const body: AddDepartmentRequest = {
      userStaffMemberId: sessionUser.staffMemberId,
      departmentName: form.departmentName?.trim() || '',
      description: form.description?.trim() || '',
      remark: form.remark?.trim() || '',
      isActive: form.isActive ?? true,
    };

    this.isSaving.set(true);
    this.#departmentsApi
      .addDepartment(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#lookupStore.reloadDepartmentOptions();
            this.#dialogRef.close(res);
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  updateDepartment() {
    const sessionUser = this.loginInfo?.user;
    if (!sessionUser) return;
    const form = this.departmentForm.value;

    const body: UpdateDepartmentRequest = {
      id: this.department?.id,
      userStaffMemberId: sessionUser.staffMemberId,
      departmentName: form.departmentName?.trim() || '',
      description: form.description?.trim() || '',
      remark: form.remark?.trim() || '',
      isActive: form.isActive ?? true,
    };

    this.isSaving.set(true);
    this.#departmentsApi
      .updateDepartment(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#lookupStore.reloadDepartmentOptions();
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
