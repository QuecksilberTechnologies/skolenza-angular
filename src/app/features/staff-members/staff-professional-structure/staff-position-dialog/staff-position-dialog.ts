import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  applyEach,
  disabled,
  form,
  submit,
  validate,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { FormCheckbox, FormSelect, FormText } from '@shared/components';
import {
  InstitutionStaffCategory,
  StaffPositionMaster,
  StaffPositionRequirement,
  StaffProfessionalMaster,
} from '@shared/interfaces';
import { buildDependencyOptions } from '@shared/utilities/dependency-options';

import {
  RequirementRow,
  StaffPositionFormModel,
  staffPositionSchema,
} from './staff-position-dialog.schema';

export interface StaffPositionDialogData {
  position?: StaffPositionMaster;
  categories: InstitutionStaffCategory[];
  jobFamilies: StaffProfessionalMaster[];
  capabilities: StaffProfessionalMaster[];
  duties: StaffProfessionalMaster[];
}

/**
 * Checklist rows for every selectable master. Rows already linked to the position come first, in
 * their saved order, so saving again keeps that order.
 */
export function requirementRows(
  masters: StaffProfessionalMaster[],
  saved: StaffPositionRequirement[],
): RequirementRow[] {
  const order = new Map(saved.map((item, index) => [item.id, index]));
  return buildDependencyOptions(masters, new Set(order.keys()))
    .map((master) => ({
      id: master.id,
      name: master.name,
      inactive: master.disabled,
      selected: order.has(master.id),
      isMandatory: saved.find((item) => item.id === master.id)?.isMandatory ?? true,
    }))
    .sort((a, b) => (order.get(a.id) ?? order.size) - (order.get(b.id) ?? order.size));
}

function selectedRequirements(rows: RequirementRow[]) {
  return rows
    .filter((row) => row.selected)
    .map((row, index) => ({
      id: row.id,
      isMandatory: row.isMandatory,
      displayOrder: (index + 1) * 10,
    }));
}

/** Add or edit a Position with its capabilities and duties. Closes with `true` after saving. */
@Component({
  selector: 'app-staff-position-dialog',
  imports: [ButtonModule, FormCheckbox, FormSelect, FormText],
  templateUrl: './staff-position-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPositionDialog {
  readonly #api = inject(StaffProfessionalStructureApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #data: StaffPositionDialogData = inject(DynamicDialogConfig).data;
  readonly #position = this.#data.position;

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<StaffPositionFormModel>({
    institutionStaffCategoryMasterId: this.#position?.institutionStaffCategoryMasterId || null,
    staffJobFamilyMasterId: this.#position?.staffJobFamilyMasterId || null,
    code: this.#position?.code ?? '',
    name: this.#position?.name ?? '',
    isActive: this.#position?.isActive ?? true,
    capabilities: requirementRows(this.#data.capabilities, this.#position?.capabilities ?? []),
    duties: requirementRows(this.#data.duties, this.#position?.duties ?? []),
  });

  protected readonly categoryOptions = buildDependencyOptions(
    this.#data.categories,
    new Set([this.#position?.institutionStaffCategoryMasterId ?? 0]),
  );

  /** Only the job families the chosen category allows. */
  protected readonly jobFamilyOptions = computed(() => {
    const category = this.#data.categories.find(
      (item) => item.id === this.model().institutionStaffCategoryMasterId,
    );
    const mapped = category
      ? this.#data.jobFamilies.filter((family) =>
          category.staffJobFamilyMasterIds.includes(family.id),
        )
      : [];
    return buildDependencyOptions(mapped, new Set([this.#position?.staffJobFamilyMasterId ?? 0]));
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, staffPositionSchema);

    disabled(p.staffJobFamilyMasterId, {
      when: ({ valueOf }) => valueOf(p.institutionStaffCategoryMasterId) === null,
    });
    // Changing the category can strand a family the new category does not allow.
    validate(p.staffJobFamilyMasterId, ({ value }) => {
      const id = value();
      return id !== null && !this.jobFamilyOptions().some((family) => family.id === id)
        ? { kind: 'unmappedJobFamily', message: 'Choose a job family this category allows' }
        : undefined;
    });
    applyEach(p.capabilities, (row) =>
      disabled(row.selected, { when: ({ valueOf }) => valueOf(row.inactive) }),
    );
    applyEach(p.duties, (row) =>
      disabled(row.selected, { when: ({ valueOf }) => valueOf(row.inactive) }),
    );
  });

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const value = this.model();
      this.isSaving.set(true);
      this.#api
        .savePosition({
          id: this.#position?.id,
          institutionStaffCategoryMasterId: value.institutionStaffCategoryMasterId ?? 0,
          staffJobFamilyMasterId: value.staffJobFamilyMasterId ?? 0,
          departmentId: this.#position?.departmentId,
          code: value.code.trim(),
          name: value.name.trim(),
          description: this.#position?.description ?? '',
          displayOrder: this.#position?.displayOrder ?? 10,
          isActive: value.isActive,
          capabilities: selectedRequirements(value.capabilities),
          duties: selectedRequirements(value.duties),
        })
        .pipe(
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (response) => {
            this.#common.showMessage(response.message, response.isSucceeded ? 'success' : 'error');
            if (response.isSucceeded) this.#dialogRef.close(true);
          },
          error: (error) => this.#common.showMessage(error.message, 'error'),
        });
    });
  }

  protected cancel(): void {
    this.#dialogRef.close();
  }
}
