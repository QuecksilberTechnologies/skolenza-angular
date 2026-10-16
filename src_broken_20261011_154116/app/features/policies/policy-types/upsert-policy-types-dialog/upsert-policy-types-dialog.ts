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
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { MultiSelectModule } from '@openng/optimus-ui/multiselect';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { finalize } from 'rxjs';

import { Common, PolicyTypeApi } from '@core/services';
import { LookupStore } from '@core/stores/lookup.store';
import { FormFileUpload } from '@shared/components/profile/form-file-upload/form-file-upload';
import { LoginInfo, PolicyType, PolicyTypeEnum, PolicyTypeForm } from '@shared/interfaces';

@Component({
  selector: 'app-upsert-policy-types-dialog',
  imports: [
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ReactiveFormsModule,
    MessageModule,
    MultiSelectModule,
    FormFileUpload,
  ],
  templateUrl: './upsert-policy-types-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertPolicyTypesDialog implements OnInit {
  readonly #policyTypeApi = inject(PolicyTypeApi);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #dynamicDialogConfig = inject(DynamicDialogConfig);
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #lookupStore = inject(LookupStore);
  readonly staffEmploymentTypeOptions = this.#lookupStore.staffEmploymentTypes;
  readonly isLoadingStaffEmploymentTypes = this.#lookupStore.isLoadingStaffEmploymentTypes;
  protected isSaving = signal(false);
  protected policyTypeForm!: FormGroup<PolicyTypeForm>;
  protected policyType!: PolicyType;
  protected selectedFile: File | null = null;
  protected loginInfo!: LoginInfo;

  protected readonly policyTypeEnumOptions = [
    { label: 'Insurance', value: PolicyTypeEnum.Insurance },
    { label: 'Leave', value: PolicyTypeEnum.Leave },
    { label: 'Rental', value: PolicyTypeEnum.Rental },
    { label: 'Other', value: PolicyTypeEnum.Other },
  ];

  constructor() {
    this.initForm();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
    this.#lookupStore.initialize(this.loginInfo?.user?.staffMemberId);
    this.policyType = this.#dynamicDialogConfig.data.policyType;

    if (this.policyType) {
      this.patchForm();
    }
  }

  initForm() {
    this.policyTypeForm = this.#fb.group({
      policyName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      // policyTypeEnumVal: [null as number | null, [Validators.required]],
      staffEmploymentTypeIds: [[] as number[], [Validators.required, Validators.minLength(1)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      document: '',
    });
  }

  patchForm() {
    this.policyTypeForm.patchValue({
      policyName: this.policyType?.policyName,
      // policyTypeEnumVal: this.policyType?.policyTypeEnumVal ?? null,
      staffEmploymentTypeIds: this.policyType?.staffEmploymentTypeIds ?? [],
      description: this.policyType?.description || '',
      document: '',
    });
  }

  isInvalid(controlName: string) {
    const control = this.policyTypeForm.get(controlName);
    return control?.invalid && control.touched;
  }

  onSelectFile(file: File | null) {
    if (file) {
      if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) {
        this.#commonService.showMessage('Only PDF documents are allowed!', 'error');
        return;
      }

      const validTypes = ['application/pdf'];
      if (!file.type || !validTypes.includes(file.type)) {
        const msg = 'Invalid file format. Allowed: PDF only.';
        this.#commonService.showMessage(msg, 'error');
        return;
      }
    }

    this.selectedFile = file;
  }

  async onSubmit() {
    this.policyTypeForm.markAllAsTouched();
    if (this.policyTypeForm.invalid) return;

    const form = this.policyTypeForm.getRawValue();

    const fd = new FormData();
    fd.append('PolicyName', form.policyName);
    // fd.append('PolicyTypeEnumVal', String(form.policyTypeEnumVal ?? ''));
    fd.append('PolicyTypeEnumVal', PolicyTypeEnum.Rental.toString());
    form.staffEmploymentTypeIds.forEach((id, index) => {
      fd.append(`StaffEmploymentTypeIds[${index}]`, String(id));
    });
    fd.append('Description', form.description);
    fd.append('IsActive', 'true');
    fd.append('IsStructured', 'false');

    if (this.selectedFile) {
      fd.append('FormFile', this.selectedFile);
    }

    if (this.policyType?.id) {
      fd.append('Id', String(this.policyType.id));
    }

    const endpoint = this.policyType?.id
      ? this.#policyTypeApi.updatePolicyType(fd)
      : this.#policyTypeApi.createPolicyType(fd);

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
            this.#dialogRef.close(form);
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
