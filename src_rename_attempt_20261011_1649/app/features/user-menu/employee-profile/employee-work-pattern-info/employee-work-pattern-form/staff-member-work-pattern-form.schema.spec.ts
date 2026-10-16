import { WorkMode, WorkPatternDay } from '@shared/interfaces';

import {
  StaffMemberWorkPatternFormModel,
  staffMemberWorkPatternSchema,
} from './staffMember-work-pattern-form.schema';

const validModel: StaffMemberWorkPatternFormModel = {
  dayOfWeek: WorkPatternDay.Monday,
  workMode: WorkMode.Office,
  campusId: 3,
  isWorkingDay: true,
  isActive: true,
};

const issuePaths = (model: StaffMemberWorkPatternFormModel): string[] => {
  const result = staffMemberWorkPatternSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('staffMemberWorkPatternSchema', () => {
  it('accepts an office day', () => {
    expect(issuePaths(validModel)).toEqual([]);
  });

  it('requires the day and the work mode', () => {
    expect(issuePaths({ ...validModel, dayOfWeek: null, workMode: null })).toEqual(
      expect.arrayContaining(['dayOfWeek', 'workMode']),
    );
  });

  it('requires a location for office, field and client-site days', () => {
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.Office, campusId: null }),
    ).toContain('campusId');
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.Field, campusId: null }),
    ).toContain('campusId');
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.ClientSite, campusId: null }),
    ).toContain('campusId');
  });

  it('lets a work-from-home day go without a location', () => {
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.WorkFromHome, campusId: null }),
    ).toEqual([]);
  });

  /** A weekly off is nowhere, so it needs no location even when the mode says Office. */
  it('lets a non-working day go without a location', () => {
    expect(
      issuePaths({
        ...validModel,
        workMode: WorkMode.Office,
        isWorkingDay: false,
        campusId: null,
      }),
    ).toEqual([]);
  });

  it('lets a non-working day go without a work mode', () => {
    expect(
      issuePaths({ ...validModel, workMode: null, isWorkingDay: false, campusId: null }),
    ).toEqual([]);
  });
});
