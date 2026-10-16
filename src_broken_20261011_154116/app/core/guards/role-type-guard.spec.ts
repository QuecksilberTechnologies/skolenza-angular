import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { vi } from 'vitest';

import { AuthApi, Common } from '@core/services';
import { LoginInfo, SessionUser } from '@shared/interfaces';

import { roleTypeGuard } from './role-type-guard';

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

function storeLoginInfo(loginInfo: LoginInfo): void {
  localStorage.setItem('skolenza/loginInfo', JSON.stringify(loginInfo));
}

function runGuard(allowedRoleTypeIds: number[]) {
  return TestBed.runInInjectionContext(() =>
    roleTypeGuard(allowedRoleTypeIds)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean>;
}

describe('roleTypeGuard', () => {
  const authApiMock = { redirectToDashboard: vi.fn(), logout: vi.fn() };
  const commonMock = { showMessage: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthApi, useValue: authApiMock },
        { provide: Common, useValue: commonMock },
      ],
    });
  });

  it('should allow a host into a host-only route', async () => {
    storeLoginInfo(createLoginInfo({ userType: 'Host', user: null as unknown as SessionUser }));

    await expect(runGuard([0])).resolves.toBe(true);
  });

  it('should deny a host on a institution route and redirect to the host dashboard', async () => {
    storeLoginInfo(createLoginInfo({ userType: 'Host', user: null as unknown as SessionUser }));

    await expect(runGuard([1, 3])).resolves.toBe(false);
    expect(commonMock.showMessage).toHaveBeenCalledWith(
      'You do not have access to this page',
      'error',
    );
    expect(authApiMock.redirectToDashboard).toHaveBeenCalledWith(0);
  });

  it('should keep staffMember role checks unchanged', async () => {
    storeLoginInfo(createLoginInfo());

    await expect(runGuard([1, 2, 3])).resolves.toBe(true);
    await expect(runGuard([1, 3])).resolves.toBe(false);
  });

  it('should end the session instead of looping when there is no stored role', async () => {
    await expect(runGuard([0])).resolves.toBe(false);
    expect(authApiMock.logout).toHaveBeenCalled();
    expect(authApiMock.redirectToDashboard).not.toHaveBeenCalled();
  });
});
