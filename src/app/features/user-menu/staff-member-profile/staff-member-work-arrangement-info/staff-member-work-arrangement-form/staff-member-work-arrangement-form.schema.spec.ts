import { HybridType, WorkMode } from '@shared/interfaces';

import {
  StaffMemberWorkArrangementFormModel,
  staffMemberWorkArrangementSchema,
} from './staff-member-work-arrangement-form.schema';

const validModel: StaffMemberWorkArrangementFormModel = {
  staffMemberId: 'emp-1',
  policyVersionId: 4,
  workMode: WorkMode.Hybrid,
  hybridType: HybridType.Fixed,
  primaryCampusId: 3,

  minimumOfficeDaysPerWeek: 3,
  minimumOfficeDaysPerMonth: 12,
  maximumWFHDaysPerMonth: 8,

  effectiveFrom: new Date(2026, 0, 1),
  effectiveTo: null,
  isActive: true,
};

const issuePaths = (model: StaffMemberWorkArrangementFormModel): string[] => {
  const result = staffMemberWorkArrangementSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('staffMemberWorkArrangementSchema', () => {
  it('accepts a hybrid arrangement', () => {
    expect(issuePaths(validModel)).toEqual([]);
  });

  it('requires an staffMember', () => {
    expect(issuePaths({ ...validModel, staffMemberId: null })).toContain('staffMemberId');
    expect(issuePaths({ ...validModel, staffMemberId: '' })).toContain('staffMemberId');
  });

  it('requires the policy, work mode and start date before hybrid rules can be evaluated', () => {
    const paths = issuePaths({
      ...validModel,
      policyVersionId: null,
      workMode: null,
      hybridType: null,
      effectiveFrom: null,
    });

    expect(paths).toEqual(expect.arrayContaining(['policyVersionId', 'workMode', 'effectiveFrom']));
  });

  it('requires hybrid type only for hybrid work', () => {
    expect(issuePaths({ ...validModel, hybridType: null })).toContain('hybridType');
    expect(
      issuePaths({
        ...validModel,
        workMode: WorkMode.WorkFromHome,
        hybridType: null,
        primaryCampusId: null,
      }),
    ).not.toContain('hybridType');
  });

  it('requires a primary location for office, hybrid and client-site work', () => {
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.Office, primaryCampusId: null }),
    ).toContain('primaryCampusId');
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.Hybrid, primaryCampusId: null }),
    ).toContain('primaryCampusId');
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.ClientSite, primaryCampusId: null }),
    ).toContain('primaryCampusId');
  });

  it('lets work from home go without a primary location', () => {
    expect(
      issuePaths({
        ...validModel,
        workMode: WorkMode.WorkFromHome,
        primaryCampusId: null,
      }),
    ).toEqual([]);
  });

  it('rejects a monthly minimum below the weekly one', () => {
    expect(
      issuePaths({ ...validModel, minimumOfficeDaysPerWeek: 4, minimumOfficeDaysPerMonth: 2 }),
    ).toContain('minimumOfficeDaysPerMonth');
  });

  it('rejects day counts past a week or a month', () => {
    expect(issuePaths({ ...validModel, minimumOfficeDaysPerWeek: 8 })).toContain(
      'minimumOfficeDaysPerWeek',
    );
    expect(issuePaths({ ...validModel, maximumWFHDaysPerMonth: 32 })).toContain(
      'maximumWFHDaysPerMonth',
    );
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
});
