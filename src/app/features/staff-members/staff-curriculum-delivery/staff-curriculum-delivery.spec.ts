import { describe, expect, it } from 'vitest';

import { CurriculumUnit, StaffTeachingAssignment } from '@shared/interfaces';

import { topicsForTeachingAssignment } from './staff-curriculum-delivery';

describe('StaffCurriculumDelivery topic selection', () => {
  it('offers only topics belonging to the selected teaching assignment course offering', () => {
    const units = [
      { courseOfferingId: 11, topics: [{ id: 101, name: 'Fractions' }] },
      { courseOfferingId: 22, topics: [{ id: 202, name: 'Grammar' }] },
    ] as CurriculumUnit[];
    const assignments = [
      { id: 7, courseOfferingId: 11 },
      { id: 8, courseOfferingId: 22 },
    ] as StaffTeachingAssignment[];

    expect(topicsForTeachingAssignment(units, assignments, 7).map((topic) => topic.id)).toEqual([
      101,
    ]);
  });

  it('offers no topics until a valid teaching assignment is selected', () => {
    expect(topicsForTeachingAssignment([], [], 0)).toEqual([]);
  });
});
