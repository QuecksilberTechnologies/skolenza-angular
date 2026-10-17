import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validate, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize, Observable } from 'rxjs';

import { Common, StaffCurriculumDeliveryApi } from '@core/services';
import { FormNumber, FormSelect, FormText, FormTextarea } from '@shared/components';
import { AcademicMaster, CurriculumTopic, CurriculumUnit } from '@shared/interfaces';

import { optionalText } from '../curriculum-workflow';
import { CurriculumUnitFormModel, curriculumUnitSchema } from './curriculum-unit-dialog.schema';

export type CurriculumUnitDialogData =
  | { kind: 'unit'; frameworkId: number; unit?: CurriculumUnit; offerings: AcademicMaster[] }
  | { kind: 'topic'; topic?: CurriculumTopic; unitId?: number; units: CurriculumUnit[] };

/** Add or edit a curriculum unit or topic. Closes with `true` after a successful save. */
@Component({
  selector: 'app-curriculum-unit-dialog',
  imports: [ButtonModule, FormNumber, FormSelect, FormText, FormTextarea],
  templateUrl: './curriculum-unit-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurriculumUnitDialog {
  readonly #api = inject(StaffCurriculumDeliveryApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #data: CurriculumUnitDialogData = inject(DynamicDialogConfig).data;
  readonly #record: CurriculumUnit | CurriculumTopic | undefined =
    this.#data.kind === 'unit' ? this.#data.unit : this.#data.topic;

  protected readonly isTopic = this.#data.kind === 'topic';
  protected readonly parentLabel = this.isTopic ? 'Unit' : 'Course offering';
  protected readonly parentOptions: { id: number; name: string }[] =
    this.#data.kind === 'unit' ? this.#data.offerings : this.#data.units;
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<CurriculumUnitFormModel>({
    parentId: this.#initialParentId() || null,
    code: this.#record?.code ?? '',
    name: this.#record?.name ?? '',
    sequence: this.#record?.sequence ?? 1,
    plannedPeriods: this.#record?.plannedPeriods ?? 1,
    learningOutcome: this.#record?.learningOutcome ?? '',
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, curriculumUnitSchema);
    // The schema's message is generic; name the parent the user is actually picking.
    validate(p.parentId, ({ value }) =>
      value() === null
        ? { kind: 'required', message: `${this.parentLabel} is required` }
        : undefined,
    );
  });

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      this.isSaving.set(true);
      this.#request()
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

  #initialParentId(): number | undefined {
    return this.#data.kind === 'unit'
      ? this.#data.unit?.courseOfferingId
      : (this.#data.topic?.curriculumUnitId ?? this.#data.unitId);
  }

  #request(): Observable<{ isSucceeded: boolean; message: string }> {
    const value = this.model();
    const shared = {
      code: value.code.trim(),
      name: value.name.trim(),
      description: this.#record?.description,
      sequence: value.sequence ?? 1,
      plannedPeriods: value.plannedPeriods ?? 1,
      learningOutcome: optionalText(value.learningOutcome),
      isActive: this.#record?.isActive ?? true,
    };
    if (this.#data.kind === 'topic') {
      return this.#api.saveTopic({
        ...shared,
        id: this.#data.topic?.id,
        curriculumUnitId: value.parentId ?? 0,
      });
    }
    return this.#api.saveUnit({
      ...shared,
      id: this.#data.unit?.id,
      curriculumFrameworkId: this.#data.unit?.curriculumFrameworkId ?? this.#data.frameworkId,
      courseOfferingId: value.parentId ?? 0,
      parentCurriculumUnitId: this.#data.unit?.parentCurriculumUnitId,
    });
  }
}
