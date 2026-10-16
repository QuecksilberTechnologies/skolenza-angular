import { COMPETENCIES, CompetencyRating, PmsStatus, Review, ReviewCycle } from '@shared/interfaces';

export interface ReviewFormModel {
  cycle: ReviewCycle;
  staffMemberName: string;
  reviewerName: string;
  selfReview: string;
  managerReview: string;
  goalsRating: number;
  competencies: CompetencyRating[];
  overallRating: number;
  comments: string;
  status: PmsStatus;
  dueDate: Date | null;
}

function defaultCompetencies(): CompetencyRating[] {
  return COMPETENCIES.map((competency) => ({ competency, rating: 0 }));
}

export function reviewToForm(review: Review): ReviewFormModel {
  return {
    cycle: review.cycle,
    staffMemberName: review.staffMemberName,
    reviewerName: review.reviewerName,
    selfReview: review.selfReview,
    managerReview: review.managerReview,
    goalsRating: review.goalsRating,
    competencies: review.competencies.length ? review.competencies : defaultCompetencies(),
    overallRating: review.overallRating,
    comments: review.comments,
    status: review.status,
    dueDate: review.dueDate ? new Date(review.dueDate) : null,
  };
}

function ymd(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

export function formToReview(model: ReviewFormModel, base: Review): Review {
  return {
    ...base,
    cycle: model.cycle,
    staffMemberName: model.staffMemberName.trim(),
    reviewerName: model.reviewerName.trim(),
    selfReview: model.selfReview.trim(),
    managerReview: model.managerReview.trim(),
    goalsRating: model.goalsRating,
    competencies: model.competencies,
    overallRating: model.overallRating,
    comments: model.comments.trim(),
    status: model.status,
    dueDate: ymd(model.dueDate),
  };
}
