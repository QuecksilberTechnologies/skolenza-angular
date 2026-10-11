import { Review } from '@shared/interfaces';

import { formToReview, reviewToForm } from './pms-review-form.model';

const sampleReview: Review = {
  id: 'r-1',
  cycle: 'Q1-2026',
  staffMemberId: 'e-1',
  staffMemberName: 'Jane',
  reviewerId: 'm-1',
  reviewerName: 'Meera',
  selfReview: 'self',
  managerReview: 'mgr',
  goalsRating: 4,
  competencies: [{ competency: 'Communication', rating: 5 }],
  overallRating: 4,
  comments: 'good',
  status: 'Completed',
  dueDate: '2026-04-10',
};

describe('pms-review-form.model', () => {
  it('reviewToForm fills default competencies when none provided', () => {
    const form = reviewToForm({ ...sampleReview, competencies: [] });
    expect(form.competencies.length).toBeGreaterThan(0);
    expect(form.competencies[0].rating).toBe(0);
  });

  it('reviewToForm keeps existing competencies', () => {
    const form = reviewToForm(sampleReview);
    expect(form.competencies).toHaveLength(1);
    expect(form.competencies[0].rating).toBe(5);
  });

  it('formToReview merges base, trims text, serializes due date', () => {
    const form = reviewToForm(sampleReview);
    form.comments = '  trimmed  ';
    const result = formToReview(form, sampleReview);
    expect(result.id).toBe('r-1');
    expect(result.comments).toBe('trimmed');
    expect(result.dueDate).toBe('2026-04-10');
  });
});
