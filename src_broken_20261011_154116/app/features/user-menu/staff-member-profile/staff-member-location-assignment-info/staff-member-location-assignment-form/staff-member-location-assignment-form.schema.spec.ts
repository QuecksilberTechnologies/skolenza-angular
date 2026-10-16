import {
  StaffMemberLocationAssignmentFormModel,
  staffMemberLocationAssignmentSchema,
} from './staffMember-location-assignment-form.schema';

const validModel: StaffMemberLocationAssignmentFormModel = {
  staffMemberId: 'emp-1',
  institutionLocationId: 3,
  isPrimary: true,
  isAttendanceAllowed: true,
  effectiveFrom: new Date(2026, 0, 1),
  effectiveTo: null,
  isActive: true,
};

const issuePaths = (model: StaffMemberLocationAssignmentFormModel): string[] => {
  const result = staffMemberLocationAssignmentSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('staffMemberLocationAssignmentSchema', () => {
  it('accepts an open-ended assignment', () => {
    expect(issuePaths(validModel)).toEqual([]);
  });

  it('requires an staffMember, a location and a start date', () => {
    const paths = issuePaths({
      ...validModel,
      staffMemberId: null,
      institutionLocationId: null,
      effectiveFrom: null,
    });

    expect(paths).toEqual(
      expect.arrayContaining(['staffMemberId', 'institutionLocationId', 'effectiveFrom']),
    );
  });

  it('rejects an empty staffMember id', () => {
    expect(issuePaths({ ...validModel, staffMemberId: '' })).toContain('staffMemberId');
  });

  it('rejects an end date before the start date', () => {
    expect(
      issuePaths({
        ...validModel,
        effectiveFrom: new Date(2026, 5, 1),
        effectiveTo: new Date(2026, 4, 1),
      }),
    ).toContain('effectiveTo');
  });

  it('accepts an end date on the start date', () => {
    const sameDay = new Date(2026, 5, 1);
    expect(issuePaths({ ...validModel, effectiveFrom: sameDay, effectiveTo: sameDay })).toEqual([]);
  });
});
