import { staffMemberWorkModeOverrideDecisionSchema } from './staff-member-work-mode-override-decision-dialog.schema';

describe('staffMemberWorkModeOverrideDecisionSchema', () => {
  const issues = (remark: string) =>
    staffMemberWorkModeOverrideDecisionSchema
      .safeParse({ remark })
      .error?.issues.map((issue) => issue.message) ?? [];

  it('accepts a reason', () => {
    expect(issues('Dates conflict with a client visit')).toEqual([]);
  });

  it('rejects a blank or whitespace-only reason', () => {
    expect(issues('')).toEqual(['Rejection reason is required']);
    expect(issues('   ')).toEqual(['Rejection reason is required']);
  });

  it('caps the reason at 500 characters', () => {
    expect(issues('a'.repeat(501))).toEqual(['Rejection reason must be 500 characters or fewer']);
  });
});
