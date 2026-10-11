import { Goal } from '@shared/interfaces';

import { emptyGoalForm, formToGoal, goalToForm } from './pms-goal-form.model';

const sampleGoal: Goal = {
  id: 'g-1',
  title: 'Increase NPS',
  description: 'Drive satisfaction',
  category: 'Business',
  weight: 25,
  progress: 70,
  startDate: '2026-01-01',
  dueDate: '2026-06-30',
  status: 'InReview',
  ownerId: 'e-1',
  ownerName: 'Jane',
};

describe('pms-goal-form.model', () => {
  it('emptyGoalForm starts blank with sensible defaults', () => {
    const form = emptyGoalForm();
    expect(form.title).toBe('');
    expect(form.status).toBe('Draft');
    expect(form.startDate).toBeNull();
  });

  it('goalToForm maps entity and parses ISO dates to Date', () => {
    const form = goalToForm(sampleGoal);
    expect(form.title).toBe('Increase NPS');
    expect(form.startDate).toBeInstanceOf(Date);
    expect(form.dueDate?.getUTCFullYear()).toBe(2026);
  });

  it('formToGoal trims text and serializes dates to yyyy-MM-dd', () => {
    const form = goalToForm(sampleGoal);
    form.title = '  Padded  ';
    const result = formToGoal(form, sampleGoal);
    expect(result.title).toBe('Padded');
    expect(result.startDate).toBe('2026-01-01');
    expect(result.id).toBe('g-1');
  });

  it('formToGoal preserves owner from base on edit', () => {
    const result = formToGoal(goalToForm(sampleGoal), sampleGoal);
    expect(result.ownerName).toBe('Jane');
  });
});
