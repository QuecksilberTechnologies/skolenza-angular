import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DatePickerModule } from '@openng/optimus-ui/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { SelectModule } from '@openng/optimus-ui/select';

import { PMS_STATUS_OPTIONS, REVIEW_CYCLES, Review } from '@shared/interfaces';

import { PmsRatingStars } from '../../ui/pms-rating-stars';
import { PmsReviewsStore } from '../pms-reviews.store';
import { formToReview, reviewToForm } from './pms-review-form.model';

interface ReviewDialogData {
  review: Review;
  store: InstanceType<typeof PmsReviewsStore>;
  canManageReview: boolean;
}

@Component({
  selector: 'app-pms-review-form',
  imports: [
    FormField,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    PmsRatingStars,
  ],
  templateUrl: './pms-review-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PmsReviewForm {
  readonly #ref = inject(DynamicDialogRef);
  readonly #config = inject<DynamicDialogConfig<ReviewDialogData>>(DynamicDialogConfig);
  readonly #data = this.#config.data!;
  readonly #base = this.#data.review;

  readonly isSaving = signal(false);
  readonly canManage = this.#data.canManageReview;
  readonly model = signal(reviewToForm(this.#base));

  readonly cycleOptions = [...REVIEW_CYCLES];
  readonly statusOptions = PMS_STATUS_OPTIONS;

  readonly f = form(this.model, (p) => {
    required(p.cycle, { message: 'Cycle is required' });
    required(p.staffMemberName, { message: 'StaffMember is required' });
    required(p.reviewerName, { message: 'Reviewer is required' });
  });

  setGoalsRating(rating: number): void {
    if (!this.canManage) return;
    this.model.update((m) => ({ ...m, goalsRating: rating }));
  }

  setOverallRating(rating: number): void {
    if (!this.canManage) return;
    this.model.update((m) => ({ ...m, overallRating: rating }));
  }

  setCompetencyRating(index: number, rating: number): void {
    if (!this.canManage) return;
    this.model.update((m) => ({
      ...m,
      competencies: m.competencies.map((c, i) => (i === index ? { ...c, rating } : c)),
    }));
  }

  async save(): Promise<void> {
    await submit(this.f, async () => {
      this.isSaving.set(true);
      this.#data.store.saveReview(formToReview(this.model(), this.#base));
      this.isSaving.set(false);
      this.#ref.close(true);
      return undefined;
    });
  }

  cancel(): void {
    this.#ref.close(false);
  }
}
