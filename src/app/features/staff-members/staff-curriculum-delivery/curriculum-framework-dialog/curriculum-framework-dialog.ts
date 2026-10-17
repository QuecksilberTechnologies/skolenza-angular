import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffCurriculumDeliveryApi } from '@core/services';
import { FormCheckbox, FormDate, FormSelect, FormText } from '@shared/components';
import { AcademicMaster, CurriculumFramework } from '@shared/interfaces';
import { fromDateKey, localDateKey } from '@shared/utilities/date-key';

import {
  CurriculumFrameworkFormModel,
  curriculumFrameworkSchema,
} from './curriculum-framework-dialog.schema';

export interface CurriculumFrameworkDialogData {
  framework?: CurriculumFramework;
  sessions: AcademicMaster[];
}

/** Add or edit a curriculum framework. Closes with `true` after a successful save. */
@Component({
  selector: 'app-curriculum-framework-dialog',
  imports: [ButtonModule, FormCheckbox, FormDate, FormSelect, FormText],
  templateUrl: './curriculum-framework-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurriculumFrameworkDialog {
  readonly #api = inject(StaffCurriculumDeliveryApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #data: CurriculumFrameworkDialogData = inject(DynamicDialogConfig).data;
  readonly #framework = this.#data.framework;

  protected readonly sessions = this.#data.sessions;
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<CurriculumFrameworkFormModel>({
    academicSessionId: this.#framework?.academicSessionId || null,
    code: this.#framework?.code ?? '',
    name: this.#framework?.name ?? '',
    authorityName: this.#framework?.authorityName ?? '',
    version: this.#framework?.version ?? '',
    effectiveFrom: fromDateKey(this.#framework?.effectiveFrom ?? null),
    effectiveTo: fromDateKey(this.#framework?.effectiveTo ?? null),
    isActive: this.#framework?.isActive ?? true,
  });

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, curriculumFrameworkSchema);
  });

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const value = this.model();
      this.isSaving.set(true);
      this.#api
        .saveFramework({
          id: this.#framework?.id,
          academicSessionId: value.academicSessionId ?? 0,
          code: value.code.trim(),
          name: value.name.trim(),
          authorityName: value.authorityName.trim(),
          version: value.version.trim(),
          effectiveFrom: value.effectiveFrom ? localDateKey(value.effectiveFrom) : '',
          effectiveTo: value.effectiveTo ? localDateKey(value.effectiveTo) : undefined,
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
