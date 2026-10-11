import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize, Observable } from 'rxjs';

import { Common, StaffEmploymentTypesAPI } from '@core/services';
import { LookupStore } from '@core/stores';
import { FormActionBar } from '@shared/components/form-action-bar/form-action-bar';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { FormText } from '@shared/components/form-inputs/form-text/form-text';
import { FormTextarea } from '@shared/components/form-inputs/form-textarea/form-textarea';
import { StaffEmploymentType, GetStaffEmploymentTypesResponse } from '@shared/interfaces';

import { StaffEmploymentTypeModel, staffEmploymentTypeSchema } from './staff-employment-type-manage-dialog.schema';

/**
 * Adds or edits one staffMember type.
 *
 * `moduleId` / `operationId` are not sent from here: `moduleOperationInterceptor` resolves them
 * for `/StaffEmploymentType/*` off the controller fallback in `MODULE_OPERATION_ROUTES`.
 */
@Component({
  selector: 'app-staff-employment-type-manage-dialog',
  imports: [FormActionBar, FormText, FormTextarea, FormSelect],
  templateUrl: './staff-employment-type-manage-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffEmploymentTypeManageDialog {
  readonly #staffEmploymentTypesApi = inject(StaffEmploymentTypesAPI);
  readonly #commonService = inject(Common);
  readonly #lookupStore = inject(LookupStore);
  readonly #dialogConfig = inject(DynamicDialogConfig);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly staffEmploymentType = this.#dialogConfig.data?.staffEmploymentType as StaffEmploymentType | null;

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  protected readonly model = signal<StaffEmploymentTypeModel>({
    typeName: this.staffEmploymentType?.typeName ?? '',
    description: this.staffEmploymentType?.description ?? '',
    remark: this.staffEmploymentType?.remark ?? '',
    isActive: this.staffEmploymentType?.isActive ?? true,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffEmploymentTypeSchema);
  });

  onSubmit(): void {
    if (this.isSaving()) return;

    this.submitted.set(true);
    this.f().markAsTouched();

    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const { typeName, description, remark, isActive } = this.model();
      const body = {
        typeName: typeName.trim(),
        description: description.trim(),
        remark: remark.trim(),
        isActive,
      };

      const id = this.staffEmploymentType?.id;
      const request: Observable<GetStaffEmploymentTypesResponse> = id
        ? this.#staffEmploymentTypesApi.updateStaffEmploymentType({ id, ...body })
        : this.#staffEmploymentTypesApi.addStaffEmploymentType(body);

      this.isSaving.set(true);
      request
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.#commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            if (res.isSucceeded) {
              this.#lookupStore.reloadStaffEmploymentTypes();
              this.#dialogRef.close(res);
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

