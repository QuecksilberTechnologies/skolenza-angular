import { LoginInfo, SessionUser } from '@shared/interfaces';

import { isHostLogin, resolveRoleTypeId } from './login-info';

function createLoginInfo(overrides: Partial<LoginInfo> = {}): LoginInfo {
  return {
    userType: 'InstitutionStaffMember',
    accessToken: 'tok',
    refreshToken: 'rtok',
    accessTokenExpiresAtUtc: '',
    refreshTokenExpiresAtUtc: '',
    user: { primaryRole: { roleTypeId: 2 } } as SessionUser,
    ...overrides,
  };
}

describe('login-info', () => {
  it('should report a host login only when userType is Host', () => {
    expect(isHostLogin(createLoginInfo({ userType: 'Host' }))).toBe(true);
    expect(isHostLogin(createLoginInfo())).toBe(false);
    expect(isHostLogin(null)).toBe(false);
  });

  it('should resolve the staffMember roleTypeId', () => {
    expect(resolveRoleTypeId(createLoginInfo())).toBe(2);
  });

  it('should resolve a host login to roleTypeId 0', () => {
    const host = createLoginInfo({
      userType: 'Host',
      user: null as unknown as SessionUser,
    });

    expect(resolveRoleTypeId(host)).toBe(0);
  });

  it('should resolve to undefined when there is neither staffMember nor host info', () => {
    expect(resolveRoleTypeId(null)).toBeUndefined();
    expect(
      resolveRoleTypeId(createLoginInfo({ user: null as unknown as SessionUser })),
    ).toBeUndefined();
  });
});
