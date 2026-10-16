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

import { Common, DesignationsApi } from '@core/services';
import { TrimInput } from '@shared/directives';
import {
  AddDesignationRequest,
  Department,
  DesignationForm,
  IDesignation,
  LoginInfo,
  UpdateDesignationRequest,
} from '@shared/interfaces';
import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

@Component({
  selector: 'app-designation-manage-dialog',
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
  templateUrl: './designation-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DesignationManageDialog implements OnInit {
  readonly #designationsApi = inject(DesignationsApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);
  protected designationForm!: FormGroup<DesignationForm>;
  protected departments = signal<Department[]>([]);
  protected designation!: IDesignation;
  protected loginInfo!: LoginInfo;
  protected isSaving = signal(false);

  readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  constructor() {
    this.designation = this.#dynamicDialogConfig.data.designation;
    this.departments.set(this.#dynamicDialogConfig.data.departments);
    this.initForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    if (this.designation?.id) {
      this.patchForm();
    }
  }

  initForm() {
    this.designationForm = this.#fb.group({
      designationName: [
        '',
        [Validators.required, Validators.minLength(3), Validators.pattern(LABEL_PATTERN)],
      ],
      description: ['', Validators.maxLength(250)],
      departmentId: this.#fb.control<number | null>(null, Validators.required),
      isActive: [true],
    });
  }

  patchForm() {
    this.designationForm.patchValue({
      designationName: this.designation?.designationName,
      description: this.designation?.description,
      departmentId: this.designation?.departmentId ? Number(this.designation.departmentId) : null,
      isActive: this.designation?.isActive ?? true,
    });
  }

  isInvalid(controlName: string) {
    const control = this.designationForm.get(controlName);
    return control?.invalid && control.touched;
  }

  async onSubmit() {
    if (this.designation?.id) {
      this.updateDesignation();
    } else {
      this.addDesignation();
    }
  }

  addDesignation() {
    const form = this.designationForm.value;
    const body: AddDesignationRequest = {
      userStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
      departmentId: Number(form.departmentId ?? 0),
      designationName: form.designationName?.trim() ?? '',
      description: form.description?.trim() ?? '',
      isActive: form.isActive ?? true,
    };

    this.isSaving.set(true);
    this.#designationsApi
      .addDesignation(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close({ res, departmentId: form.departmentId });
          }
        },
        error: (err) => {
          this.#commonService.showMessage(err.message, 'error');
        },
      });
  }

  updateDesignation() {
    const form = this.designationForm.value;
    const body: UpdateDesignationRequest = {
      id: this.designation.id,
      userStaffMemberId: this.loginInfo?.user?.staffMemberId ?? '',
      departmentId: Number(form.departmentId ?? 0),
      designationName: form.designationName?.trim() ?? '',
      description: form.description?.trim() ?? '',
      isActive: form.isActive ?? true,
    };

    this.isSaving.set(true);
    this.#designationsApi
      .updateDesignation(body)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
          if (res.isSucceeded) {
            this.#dialogRef.close({ res, departmentId: form.departmentId });
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
