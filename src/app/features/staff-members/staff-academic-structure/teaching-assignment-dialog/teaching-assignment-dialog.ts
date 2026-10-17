import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, submit, validate, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { FormCheckbox, FormDate, FormNumber, FormSelect } from '@shared/components';
import {
  AcademicMaster,
  StaffTeachingAssignment,
  TeachingAssignmentTypeOption,
} from '@shared/interfaces';
import { fromDateKey, localDateKey, toDateKey } from '@shared/utilities/date-key';
import { buildDependencyOptions } from '@shared/utilities/dependency-options';

import {
  TeachingAssignmentFormModel,
  teachingAssignmentSchema,
} from './teaching-assignment-dialog.schema';

export interface TeachingAssignmentDialogData {
  staffMemberId: string;
  assignment?: StaffTeachingAssignment;
  offerings: AcademicMaster[];
  sections: AcademicMaster[];
  assignmentTypes: TeachingAssignmentTypeOption[];
}

/** Add or edit a staff member's subject teaching assignment. Closes with `true` after saving. */
@Component({
  selector: 'app-teaching-assignment-dialog',
  imports: [ButtonModule, FormCheckbox, FormDate, FormNumber, FormSelect],
  templateUrl: './teaching-assignment-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeachingAssignmentDialog {
  readonly #api = inject(StaffAcademicStructureApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  protected readonly data: TeachingAssignmentDialogData = inject(DynamicDialogConfig).data;
  readonly #assignment = this.data.assignment;

  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<TeachingAssignmentFormModel>({
    courseOfferingId: this.#assignment?.courseOfferingId || null,
    classSectionId: this.#assignment?.classSectionId || null,
    assignmentType: this.#assignment?.assignmentType ?? 1,
    contributionPercent: this.#assignment?.contributionPercent ?? 100,
    effectiveFrom: this.#assignment
      ? fromDateKey(toDateKey(this.#assignment.effectiveFrom))
      : fromDateKey(localDateKey()),
    effectiveTo: this.#assignment?.effectiveTo
      ? fromDateKey(toDateKey(this.#assignment.effectiveTo))
      : null,
    isPrimary: this.#assignment?.isPrimary ?? true,
    isActive: this.#assignment?.isActive ?? true,
  });

  /** Active offerings, plus the saved one if it has since been deactivated (shown, locked). */
  protected readonly offeringOptions = buildDependencyOptions(
    this.data.offerings,
    new Set(this.#assignment?.courseOfferingId ? [this.#assignment?.courseOfferingId] : []),
  );

  /** Sections of the chosen offering's group only, keeping the saved section the same way. */
  protected readonly sectionOptions = computed(() => {
    const groupId = this.data.offerings.find(
      (item) => item.id === this.model().courseOfferingId,
    )?.academicGroupId;
    return groupId
      ? buildDependencyOptions(
          this.data.sections.filter((item) => item.academicGroupId === groupId),
          new Set(this.#assignment?.classSectionId ? [this.#assignment?.classSectionId] : []),
        )
      : [];
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, teachingAssignmentSchema);

    disabled(p.classSectionId, { when: ({ valueOf }) => valueOf(p.courseOfferingId) === null });
    validate(p.classSectionId, ({ value }) => {
      const id = value();
      return id !== null && !this.sectionOptions().some((section) => section.id === id)
        ? { kind: 'sectionGroup', message: "Choose a section of the offering's group" }
        : undefined;
    });
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
        .saveTeachingAssignment({
          id: this.#assignment?.id,
          staffMemberId: this.data.staffMemberId,
          courseOfferingId: value.courseOfferingId ?? 0,
          classSectionId: value.classSectionId ?? 0,
          assignmentType: value.assignmentType ?? 1,
          contributionPercent: value.contributionPercent ?? 100,
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
