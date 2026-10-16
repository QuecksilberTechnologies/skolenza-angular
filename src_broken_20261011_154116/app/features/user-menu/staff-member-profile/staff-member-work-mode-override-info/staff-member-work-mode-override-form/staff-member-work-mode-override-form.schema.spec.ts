import { WorkMode } from '@shared/interfaces';

import {
  StaffMemberWorkModeOverrideFormModel,
  staffMemberWorkModeOverrideSchema,
} from './staffMember-work-mode-override-form.schema';

const validModel: StaffMemberWorkModeOverrideFormModel = {
  staffMemberId: 'emp-1',
  requestedWorkMode: WorkMode.WorkFromHome,
  staffMemberWorkArrangementId: null,
  institutionLocationId: null,
  fromDate: new Date(2026, 7, 24),
  toDate: new Date(2026, 7, 26),
  reason: 'Personal work',
  isActive: true,
};

const issuePaths = (model: StaffMemberWorkModeOverrideFormModel): string[] => {
  const result = staffMemberWorkModeOverrideSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('staffMemberWorkModeOverrideSchema', () => {
  it('accepts a work-from-home override', () => {
    expect(issuePaths(validModel)).toEqual([]);
  });

  it('requires the staffMember, the work mode and both dates', () => {
    expect(
      issuePaths({
        ...validModel,
        staffMemberId: null,
        requestedWorkMode: null,
        fromDate: null,
        toDate: null,
      }),
    ).toEqual(expect.arrayContaining(['staffMemberId', 'requestedWorkMode', 'fromDate', 'toDate']));
  });

  it('rejects a range that ends before it starts', () => {
    expect(
      issuePaths({
        ...validModel,
        fromDate: new Date(2026, 7, 26),
        toDate: new Date(2026, 7, 24),
      }),
    ).toContain('toDate');
  });

  it('accepts a single-day override', () => {
    const sameDay = new Date(2026, 7, 24);
    expect(issuePaths({ ...validModel, fromDate: sameDay, toDate: sameDay })).toEqual([]);
  });

  it('requires a location for office, field and client-site overrides', () => {
    expect(
      issuePaths({ ...validModel, requestedWorkMode: WorkMode.Office, institutionLocationId: null }),
    ).toContain('institutionLocationId');
    expect(
      issuePaths({ ...validModel, requestedWorkMode: WorkMode.Field, institutionLocationId: null }),
    ).toContain('institutionLocationId');
    expect(
      issuePaths({ ...validModel, requestedWorkMode: WorkMode.ClientSite, institutionLocationId: null }),
    ).toContain('institutionLocationId');
  });

  it('caps the reason at 500 characters', () => {
    expect(issuePaths({ ...validModel, reason: 'x'.repeat(501) })).toContain('reason');
  });
});
