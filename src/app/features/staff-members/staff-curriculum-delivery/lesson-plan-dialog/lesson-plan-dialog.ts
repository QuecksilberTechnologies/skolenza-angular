import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, submit, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { finalize, from, map, mergeMap, Observable, of, tap, toArray } from 'rxjs';

import { Common, StaffCurriculumDeliveryApi } from '@core/services';
import { FormDate, FormMultiSelect, FormSelect, FormText, FormTextarea } from '@shared/components';
import {
  CurriculumTopic,
  CurriculumUnit,
  LessonPlan,
  StaffTeachingAssignment,
} from '@shared/interfaces';
import { fromDateKey, localDateKey } from '@shared/utilities/date-key';
import { allPages } from '@shared/utilities/paged-list';

import {
  assignmentLabel,
  optionalText,
  unitIdsForTeachingAssignment,
} from '../curriculum-workflow';
import { LessonPlanFormModel, lessonPlanSchema } from './lesson-plan-dialog.schema';

export interface LessonPlanDialogData {
  plan?: LessonPlan;
  assignments: StaffTeachingAssignment[];
  /** Units of the framework picked on the page; their topics feed the topic picker. */
  units: CurriculumUnit[];
}

/** Topic requests in flight at once, so an offering with many units does not flood the API. */
const TOPIC_REQUESTS = 4;

const sameIds = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

/** Add or edit a lesson plan (saved as a draft). Closes with `true` after a successful save. */
@Component({
  selector: 'app-lesson-plan-dialog',
  imports: [ButtonModule, FormDate, FormMultiSelect, FormSelect, FormText, FormTextarea],
  templateUrl: './lesson-plan-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonPlanDialog {
  readonly #api = inject(StaffCurriculumDeliveryApi);
  readonly #common = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #data: LessonPlanDialogData = inject(DynamicDialogConfig).data;
  readonly #plan = this.#data.plan;

  protected readonly assignmentOptions = this.#data.assignments.map((item) => ({
    id: item.id,
    label: assignmentLabel(item),
  }));
  protected readonly isSaving = signal(false);
  /** Flipped by the first submit attempt, so every outstanding error surfaces at once. */
  protected readonly submitted = signal(false);

  protected readonly model = signal<LessonPlanFormModel>({
    staffTeachingAssignmentId: this.#plan?.staffTeachingAssignmentId || null,
    curriculumTopicIds: this.#plan?.topics.map((topic) => topic.id) ?? [],
    plannedDate: fromDateKey(this.#plan?.plannedDate ?? null),
    periodReference: this.#plan?.periodReference ?? '',
    objectives: this.#plan?.objectives ?? '',
    teachingMethod: this.#plan?.teachingMethod ?? '',
    resources: this.#plan?.resources ?? '',
    activities: this.#plan?.activities ?? '',
    assessment: this.#plan?.assessment ?? '',
    homework: this.#plan?.homework ?? '',
  });

  /** Units of the chosen assignment's course offering; unchanged by edits to other fields. */
  readonly #unitIds = computed(
    () =>
      unitIdsForTeachingAssignment(
        this.#data.units,
        this.#data.assignments,
        this.model().staffTeachingAssignmentId,
      ),
    { equal: sameIds },
  );
  /** Topics per unit already fetched in this dialog, so switching back to an assignment is free. */
  readonly #unitTopics = new Map<number, CurriculumTopic[]>();
  /** Units come without topics, so the topics of the matching units are fetched here. */
  readonly #topics = rxResource({
    params: () => this.#unitIds(),
    stream: ({ params: unitIds }) => this.#topicsOf(unitIds),
  });
  protected readonly topicsLoading = this.#topics.isLoading;
  /** The topic options failed to load; saving now would drop the picked topics. */
  protected readonly topicsFailed = computed(() => this.#topics.status() === 'error');
  /** Only topics from the course offering the chosen teaching assignment teaches. */
  protected readonly topicOptions = computed(() =>
    this.#topics.hasValue() ? this.#topics.value() : [],
  );

  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, lessonPlanSchema);
    disabled(p.curriculumTopicIds, {
      when: ({ valueOf }) => valueOf(p.staffTeachingAssignmentId) === null,
    });
  });

  protected save(): void {
    this.submitted.set(true);
    this.f().markAsTouched();
    // Saving drops picked topics that are not on offer, so wait until the options have arrived.
    if (this.f().invalid() || this.topicsLoading()) return;
    if (this.topicsFailed()) {
      this.#common.showMessage(
        'The topics for this assignment did not load. Trying again.',
        'error',
      );
      this.#topics.reload();
      return;
    }

    submit(this.f, async () => {
      const value = this.model();
      this.isSaving.set(true);
      this.#api
        .saveLessonPlan({
          id: this.#plan?.id,
          staffTeachingAssignmentId: value.staffTeachingAssignmentId ?? 0,
          plannedDate: value.plannedDate ? localDateKey(value.plannedDate) : '',
          periodReference: optionalText(value.periodReference),
          objectives: value.objectives.trim(),
          teachingMethod: optionalText(value.teachingMethod),
          resources: optionalText(value.resources),
          activities: optionalText(value.activities),
          assessment: optionalText(value.assessment),
          homework: optionalText(value.homework),
          isActive: this.#plan?.isActive ?? true,
          curriculumTopicIds: this.#topicIdsToSave(value),
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

  /**
   * Topics offered under the chosen assignment. While the assignment is the saved one, the plan's
   * saved topics are kept too: the options come from the framework picked on the page, which may
   * not be the one those topics belong to, and an edit must not silently unlink them.
   */
  #topicIdsToSave(value: LessonPlanFormModel): number[] {
    const offered = new Set(this.topicOptions().map((topic) => topic.id));
    const keepSaved = value.staffTeachingAssignmentId === this.#plan?.staffTeachingAssignmentId;
    const saved = new Set(keepSaved ? (this.#plan?.topics.map((topic) => topic.id) ?? []) : []);
    return value.curriculumTopicIds.filter((id) => offered.has(id) || saved.has(id));
  }

  /** Topics of `unitIds` in unit order: cached ones at once, the rest a few requests at a time. */
  #topicsOf(unitIds: number[]): Observable<CurriculumTopic[]> {
    const missing = unitIds.filter((unitId) => !this.#unitTopics.has(unitId));
    const inOrder = () => unitIds.flatMap((unitId) => this.#unitTopics.get(unitId) ?? []);
    if (!missing.length) return of(inOrder());
    return from(missing).pipe(
      mergeMap(
        (unitId) =>
          allPages((page) => this.#api.getTopics(unitId, page)).pipe(
            tap((topics) => this.#unitTopics.set(unitId, topics)),
          ),
        TOPIC_REQUESTS,
      ),
      toArray(),
      map(inOrder),
    );
  }

  protected cancel(): void {
    this.#dialogRef.close();
  }
}
