import { IOkr } from '@shared/interfaces';

import { emptyOkrForm, formToOkr, okrToForm } from './okr-form.model';

const sampleOkr: IOkr = {
  id: 'okr-1',
  title: 'Grow revenue',
  description: 'desc',
  objective: 'obj',
  ownerStaffMemberId: 'emp-1',
  ownerName: 'Jane Doe',
  departmentId: 'dep-sales',
  department: 'Sales',
  level: 'Company',
  quarter: 'Q2-2026',
  startDate: '2026-04-01',
  endDate: '2026-06-30',
  weight: 30,
  status: 'OnTrack',
  visibility: 'Public',
  progress: 50,
  dueDate: '2026-06-30',
  createdDate: '2026-03-01T00:00:00Z',
  isActive: true,
  keyResults: [
    {
      id: 'kr-1',
      title: 'A',
      metric: 'm',
      target: 100,
      current: 50,
      unit: '%',
      progress: 50,
      weight: 60,
    },
    {
      id: 'kr-2',
      title: 'B',
      metric: 'm',
      target: 10,
      current: 10,
      unit: 'x',
      progress: 100,
      weight: 40,
    },
  ],
};

describe('okr-form.model', () => {
  describe('emptyOkrForm', () => {
    it('starts with one empty key result', () => {
      const form = emptyOkrForm();
      expect(form.keyResults).toHaveLength(1);
      expect(form.title).toBe('');
    });
  });

  describe('okrToForm', () => {
    it('maps domain entity to the editable model and parses dates into Date objects', () => {
      const form = okrToForm(sampleOkr);
      expect(form.title).toBe('Grow revenue');
      expect(form.startDate).toEqual(new Date('2026-04-01'));
      expect(form.keyResults).toHaveLength(2);
      expect(form.keyResults[0].weight).toBe(60);
    });
  });

  describe('formToOkr', () => {
    it('derives KR progress from current/target clamped to 0–100', () => {
      const model = okrToForm(sampleOkr);
      model.keyResults[0].current = 200; // over target
      const result = formToOkr(model, sampleOkr);
      expect(result.keyResults[0].progress).toBe(100);
    });

    it('computes overall progress as weighted KR average', () => {
      const model = okrToForm(sampleOkr);
      const result = formToOkr(model, sampleOkr);
      // kr1 50%*60 + kr2 100%*40 = 30 + 40 = 70
      expect(result.progress).toBe(70);
    });

    it('maps departmentId to its display name', () => {
      const model = okrToForm(sampleOkr);
      model.departmentId = 'dep-eng';
      const result = formToOkr(model);
      expect(result.department).toBe('Engineering');
    });

    it('preserves id and createdDate from the base on edit', () => {
      const model = okrToForm(sampleOkr);
      const result = formToOkr(model, sampleOkr);
      expect(result.id).toBe('okr-1');
      expect(result.createdDate).toBe('2026-03-01T00:00:00Z');
    });

    it('sets dueDate to the end date formatted as yyyy-MM-dd', () => {
      const model = okrToForm(sampleOkr);
      const result = formToOkr(model, sampleOkr);
      expect(result.dueDate).toBe('2026-06-30');
      expect(result.endDate).toBe(result.dueDate);
    });
  });
});
