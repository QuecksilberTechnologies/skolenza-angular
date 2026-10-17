import { describe, expect, it } from 'vitest';

import { StaffPositionRequirement, StaffProfessionalMaster } from '@shared/interfaces';

import { requirementRows } from './staff-position-dialog';

const master = (id: number, name: string, isActive = true) =>
  ({ id, name, isActive }) as StaffProfessionalMaster;

describe('requirementRows', () => {
  const masters = [
    master(1, 'First aid'),
    master(2, 'Lab safety', false),
    master(3, 'Driving'),
    master(4, 'Archived', false),
  ];

  it('lists linked rows first in their saved order, then the remaining active ones', () => {
    const saved = [
      { id: 3, isMandatory: false },
      { id: 2, isMandatory: true },
    ] as StaffPositionRequirement[];

    expect(requirementRows(masters, saved)).toEqual([
      { id: 3, name: 'Driving', inactive: false, selected: true, isMandatory: false },
      { id: 2, name: 'Lab safety', inactive: true, selected: true, isMandatory: true },
      { id: 1, name: 'First aid', inactive: false, selected: false, isMandatory: true },
    ]);
  });
});
