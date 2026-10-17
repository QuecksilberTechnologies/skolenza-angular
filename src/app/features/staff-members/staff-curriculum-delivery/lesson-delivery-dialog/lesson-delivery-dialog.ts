import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize } from 'rxjs';

import { Common, StaffCurriculumDeliveryApi } from '@core/services';
import { FormDate, FormNumber, FormSelect, FormText, FormTextarea } from '@shared/components';
import { LessonDelivery, LessonPlan } from '@shared/interfaces';
import { fromDateKey, localDateKey } from '@shared/utilities/date-key';

import { optionalText } from '../curriculum-workflow';
import {
  CoverageRow,
  LessonDeliveryFormModel,
  lessonDeliverySchema,
} from './lesson-delivery-dialog.schema';

export interface LessonDeliveryDialogData {
  delivery?: LessonDelivery;
  /** Plans a new delivery can be recorded against. */
  approvedPlans: LessonPlan[];
  /** Every loaded plan, so an edited delivery still finds its plan and topic names. */
  plans: LessonPlan[];
  /** Preselects a plan when recording a delivery from the Lesson Plans tab. */
  lessonPlanId?: number;
}

export function planLabel(plan: LessonPlan): string {
  return `${plan.courseOfferingName} · ${plan.plannedDate}`;
}

/** Each topic of the plan starts fully covered; the teacher lowers what was not finished. */
export function coverageForPlan(plan: LessonPlan | undefined): CoverageRow[] {
  return (plan?.topics ?? []).map((topic) => ({
    curriculumTopicId: topic.id,
    name: topic.name,
    completionPercent: 100,
  }));
}

/** Record or edit a lesson delivery (saved as a draft). Closes with `true` after saving. */
@Component({
  selector: 'app-lesson-delivery-dialog',
  imports: [ButtonModule, FormDate, FormNumber, FormSelect, FormText, FormTextarea],
  templateUrl: './lesson-delivery-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonDeliveryDialog {
  readonly #api = inject(StaffCurriculumDeliveryApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #data: LessonDeliveryDialogData = inject(DynamicDialogConfig).data;
  readonly #delivery = this.#data.delivery;

  /** Approved plans, plus the edited delivery's own plan if it is no longer approved. */
  readonly #planChoices = [
    ...this.#data.approvedPlans,
    ...this.#data.plans.filter(
      (plan) =>
        plan.id === this.#delivery?.lessonPlanId &&
        !this.#data.approvedPlans.some((approved) => approved.id === plan.id),
    ),
  ];
  protected readonly planOptions = this.#planChoices.map((plan) => ({
    id: plan.id,
    label: planLabel(plan),
  }));
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<LessonDeliveryFormModel>(this.#initialModel());

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, lessonDeliverySchema);
  });

  /** Picking another plan replaces the coverage rows with that plan's topics. */
  protected onPlanChange(): void {
    const plan = this.#planChoices.find((item) => item.id === this.model().lessonPlanId);
    this.model.update((value) => ({ ...value, coverage: coverageForPlan(plan) }));
  }

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    if (this.f().invalid()) return;

    submit(this.f, async () => {
      const value = this.model();
      this.isSaving.set(true);
      this.#api
        .saveDelivery({
          id: this.#delivery?.id,
          lessonPlanId: value.lessonPlanId ?? 0,
          deliveredDate: value.deliveredDate ? localDateKey(value.deliveredDate) : '',
          coverageNotes: value.coverageNotes.trim(),
          homework: optionalText(value.homework),
          evidenceReference: optionalText(value.evidenceReference),
          exceptionReason: optionalText(value.exceptionReason),
          replanAction: optionalText(value.replanAction),
          isActive: this.#delivery?.isActive ?? true,
          coverage: value.coverage.map((row) => ({
            curriculumTopicId: row.curriculumTopicId,
            completionPercent: row.completionPercent ?? 0,
          })),
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

  #initialModel(): LessonDeliveryFormModel {
    const delivery = this.#delivery;
    if (!delivery) {
      const plan = this.#planChoices.find((item) => item.id === this.#data.lessonPlanId);
      return {
        lessonPlanId: plan?.id ?? null,
        // The user's local calendar day, not the UTC day.
        deliveredDate: fromDateKey(localDateKey()),
        coverageNotes: '',
        coverage: coverageForPlan(plan),
        homework: '',
        evidenceReference: '',
        exceptionReason: '',
        replanAction: '',
      };
    }
    const topics = this.#data.plans.find((plan) => plan.id === delivery.lessonPlanId)?.topics ?? [];
    return {
      lessonPlanId: delivery.lessonPlanId,
      deliveredDate: fromDateKey(delivery.deliveredDate),
      coverageNotes: delivery.coverageNotes,
      coverage: delivery.coverage.map((row) => ({
        curriculumTopicId: row.curriculumTopicId,
        name:
          topics.find((topic) => topic.id === row.curriculumTopicId)?.name ?? 'Curriculum topic',
        completionPercent: row.completionPercent,
      })),
      homework: delivery.homework ?? '',
      evidenceReference: delivery.evidenceReference ?? '',
      exceptionReason: delivery.exceptionReason ?? '',
      replanAction: delivery.replanAction ?? '',
    };
  }
}
