import {
  StaffMemberDeviceEnrollmentFormModel,
  staffMemberDeviceEnrollmentSchema,
} from './staff-member-device-enrollment-form.schema';

const validModel: StaffMemberDeviceEnrollmentFormModel = {
  staffMemberId: 'emp-1',
  institutionDeviceId: '9F3KD21A',
  accessEffectiveFromDateTime: new Date('2026-09-01T09:00:00Z'),
  accessEffectiveToDateTime: null,
  isActive: true,
};

const issuePaths = (model: StaffMemberDeviceEnrollmentFormModel): string[] => {
  const result = staffMemberDeviceEnrollmentSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('staffMemberDeviceEnrollmentSchema', () => {
  it('accepts an open-ended enrollment', () => {
    expect(issuePaths(validModel)).toEqual([]);
  });

  it('accepts an enrollment with no access dates at all', () => {
    expect(issuePaths({ ...validModel, accessEffectiveFromDateTime: null })).toEqual([]);
  });

  it('requires an staffMember', () => {
    expect(issuePaths({ ...validModel, staffMemberId: null })).toContain('staffMemberId');
    expect(issuePaths({ ...validModel, staffMemberId: '' })).toContain('staffMemberId');
  });

  it('requires a device', () => {
    expect(issuePaths({ ...validModel, institutionDeviceId: null })).toContain('institutionDeviceId');
  });

  it('rejects an end that falls before the start', () => {
    expect(
      issuePaths({
        ...validModel,
        accessEffectiveToDateTime: new Date('2026-08-01T09:00:00Z'),
      }),
    ).toContain('accessEffectiveToDateTime');
  });

  it('rejects an end with no start', () => {
    expect(
      issuePaths({
        ...validModel,
        accessEffectiveFromDateTime: null,
        accessEffectiveToDateTime: new Date('2026-10-01T09:00:00Z'),
      }),
    ).toContain('accessEffectiveFromDateTime');
  });
});
