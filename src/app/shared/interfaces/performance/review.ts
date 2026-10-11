import { Competency, PmsStatus, ReviewCycle } from './pms-common';

export interface CompetencyRating {
  competency: Competency;
  rating: number; // 1–5
}

export interface Review {
  id: string;
  cycle: ReviewCycle;
  staffMemberId: string;
  staffMemberName: string;
  reviewerId: string;
  reviewerName: string;
  selfReview: string;
  managerReview: string;
  goalsRating: number; // 1–5
  competencies: CompetencyRating[];
  overallRating: number; // 1–5
  comments: string;
  status: PmsStatus;
  dueDate: string; // ISO
}
