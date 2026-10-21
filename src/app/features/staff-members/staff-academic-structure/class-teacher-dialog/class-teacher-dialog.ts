import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validate, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { FormCheckbox, FormDate, FormSelect } from '@shared/components';
import { AcademicMaster, ClassTeacherAssignment } from '@shared/interfaces';
import { fromDateKey, localDateKey, toDateKey } from '@shared/utilities/date-key';
import { buildDependencyOptions } from '@shared/utilities/dependency-options';

import { ClassTeacherFormModel, classTeacherSchema } from './class-teacher-dialog.schema';

export interface ClassTeacherDialogData {
  staffMemberId: string;
  assignment?: ClassTeacherAssignment;
  sections: AcademicMaster[];
}

/** Add or edit a staff member's class teacher responsibility. Closes with `true` after saving. */
@Component({
  selector: 'app-class-teacher-dialog',
  imports: [ButtonModule, FormCheckbox, FormDate, FormSelect],
  templateUrl: './class-teacher-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassTeacherDialog {
  readonly #api = inject(StaffAcademicStructureApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  protected readonly data: ClassTeacherDialogData = inject(DynamicDialogConfig).data;
  readonly #assignment = this.data.assignment;

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  /** Active sections, plus the saved one if it has since been deactivated (shown, locked). */
  protected readonly sectionOptions = buildDependencyOptions(
    this.data.sections,
    new Set(this.#assignment?.classSectionId ? [this.#assignment?.classSectionId] : []),
  );

  protected readonly model = signal<ClassTeacherFormModel>({
    classSectionId: this.#assignment?.classSectionId || null,
    effectiveFrom: this.#assignment
      ? fromDateKey(toDateKey(this.#assignment.effectiveFrom))
      : fromDateKey(localDateKey()),
    effectiveTo: this.#assignment?.effectiveTo
      ? fromDateKey(toDateKey(this.#assignment.effectiveTo))
      : null,
    isPrimary: this.#assignment?.isPrimary ?? true,
    isActive: this.#assignment?.isActive ?? true,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, classTeacherSchema);
    validate(p.effectiveTo, ({ value, valueOf }) => {
      const to = value();
      const from = valueOf(p.effectiveFrom);
      return to && from && to < from
        ? { kind: 'dateOrder', message: 'Effective to must be on or after effective from' }
        : undefined;
    });
  });

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const value = this.model();
      this.isSaving.set(true);
      this.#api
        .saveClassTeacherAssignment({
          id: this.#assignment?.id,
          staffMemberId: this.data.staffMemberId,
          classSectionId: value.classSectionId ?? 0,
          effectiveFrom: value.effectiveFrom ? localDateKey(value.effectiveFrom) : localDateKey(),
          effectiveTo: value.effectiveTo ? localDateKey(value.effectiveTo) : undefined,
          isPrimary: value.isPrimary,
          isActive: value.isActive,
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
