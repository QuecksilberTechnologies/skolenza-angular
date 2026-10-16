import { HybridType, WorkMode } from '@shared/interfaces';

import {
  StaffMemberWorkArrangementFormModel,
  staffMemberWorkArrangementSchema,
} from './staffMember-work-arrangement-form.schema';

const validModel: StaffMemberWorkArrangementFormModel = {
  staffMemberId: 'emp-1',
  policyVersionId: 4,
  workMode: WorkMode.Hybrid,
  hybridType: HybridType.Fixed,
  primaryInstitutionLocationId: 3,

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
        primaryInstitutionLocationId: null,
      }),
    ).not.toContain('hybridType');
  });

  it('requires a primary location for office, hybrid and client-site work', () => {
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.Office, primaryInstitutionLocationId: null }),
    ).toContain('primaryInstitutionLocationId');
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.Hybrid, primaryInstitutionLocationId: null }),
    ).toContain('primaryInstitutionLocationId');
    expect(
      issuePaths({ ...validModel, workMode: WorkMode.ClientSite, primaryInstitutionLocationId: null }),
    ).toContain('primaryInstitutionLocationId');
  });

  it('lets work from home go without a primary location', () => {
    expect(
      issuePaths({
        ...validModel,
        workMode: WorkMode.WorkFromHome,
        primaryInstitutionLocationId: null,
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
