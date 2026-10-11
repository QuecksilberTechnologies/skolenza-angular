import {
  StaffMemberResetPasswordModel,
  staffMemberResetPasswordSchema,
} from './staff-member-reset-password-dialog.schema';

const validModel: StaffMemberResetPasswordModel = {
  newPassword: 'Str0ngPass1',
  confirmPassword: 'Str0ngPass1',
};

const issuePaths = (model: StaffMemberResetPasswordModel): string[] => {
  const result = staffMemberResetPasswordSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('staffMemberResetPasswordSchema', () => {
  it('accepts a matching pair inside the length bounds', () => {
    expect(issuePaths(validModel)).toEqual([]);
  });

  it('rejects a password under 8 characters', () => {
    expect(issuePaths({ newPassword: 'Sh0rt', confirmPassword: 'Sh0rt' })).toContain('newPassword');
  });

  it('rejects a password over 20 characters', () => {
    const long = 'A'.repeat(21);
    expect(issuePaths({ newPassword: long, confirmPassword: long })).toContain('newPassword');
  });

  it('requires the confirmation', () => {
    expect(issuePaths({ ...validModel, confirmPassword: '' })).toContain('confirmPassword');
  });

  it('rejects a mismatched confirmation', () => {
    expect(issuePaths({ ...validModel, confirmPassword: 'Other0Pass1' })).toContain(
      'confirmPassword',
    );
  });
});
