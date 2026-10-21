import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { LookupStore } from '@core/stores';
import {
  FormCheckbox,
  FormMultiSelect,
  FormSelect,
  FormText,
  FormTextarea,
} from '@shared/components';
import { InstitutionStaffCategory, StaffProfessionalMaster } from '@shared/interfaces';
import { buildDependencyOptions } from '@shared/utilities/dependency-options';

import { StaffCategoryFormModel, staffCategorySchema } from './staff-category-dialog.schema';

export interface StaffCategoryDialogData {
  category?: InstitutionStaffCategory;
  jobFamilies: StaffProfessionalMaster[];
}

/** Add or edit a Staff Category and its allowed job families. Closes with `true` after saving. */
@Component({
  selector: 'app-staff-category-dialog',
  imports: [ButtonModule, FormCheckbox, FormMultiSelect, FormSelect, FormText, FormTextarea],
  templateUrl: './staff-category-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffCategoryDialog {
  readonly #api = inject(StaffProfessionalStructureApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #data: StaffCategoryDialogData = inject(DynamicDialogConfig).data;

  protected readonly categoryTypes = inject(LookupStore).staffCategories;
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<StaffCategoryFormModel>({
    staffCategoryTypeId: this.#data.category?.staffCategoryTypeId || null,
    code: this.#data.category?.code ?? '',
    name: this.#data.category?.name ?? '',
    description: this.#data.category?.description ?? '',
    staffJobFamilyMasterIds: [...(this.#data.category?.staffJobFamilyMasterIds ?? [])],
    isActive: this.#data.category?.isActive ?? true,
  });

  /** Built once from the saved selection, so an inactive family stays locked while editing. */
  protected readonly jobFamilyOptions = buildDependencyOptions(
    this.#data.jobFamilies,
    new Set(this.model().staffJobFamilyMasterIds),
  );

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffCategorySchema);
  });

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const value = this.model();
      this.isSaving.set(true);
      this.#api
        .saveCategory({
          id: this.#data.category?.id,
          staffCategoryTypeId: value.staffCategoryTypeId ?? 0,
          code: value.code.trim(),
          name: value.name.trim(),
          description: value.description.trim(),
          displayOrder: this.#data.category?.displayOrder ?? 10,
          isActive: value.isActive,
          staffJobFamilyMasterIds: value.staffJobFamilyMasterIds,
        })
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (response) => {
            if (!response.isSucceeded) {
              this.isSaving.set(false);
              this.#common.showMessage(response.message, 'error');
              return;
            }
            this.#saveJobFamilies(response.data.id, value.staffJobFamilyMasterIds);
          },
          error: (error) => {
            this.isSaving.set(false);
            this.#common.showMessage(error.message, 'error');
          },
        });
    });
  }

  protected cancel(): void {
    this.#dialogRef.close();
  }

  /**
   * The mapping is a second call, so the dialog stays busy until both have answered. If it fails,
   * an edit stays open for a retry. A new category closes anyway: it now exists, and retrying from
   * this dialog would create it a second time.
   */
  #saveJobFamilies(categoryId: number, jobFamilyIds: number[]): void {
    const isNew = !this.#data.category;
    this.#api
      .setCategoryJobFamilies(categoryId, jobFamilyIds)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
          if (response.isSucceeded || isNew) this.#dialogRef.close(true);
        },
        error: (error) => {
          this.#common.showMessage(error.message, 'error');
          if (isNew) this.#dialogRef.close(true);
        },
      });
  }
}
