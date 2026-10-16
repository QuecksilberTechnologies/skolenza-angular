import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthApi, Common } from '@core/services';
import { AuthStore, CurrentUserPermissionsStore } from '@core/stores';
import { DetectDevice, LoginInfo, LoginResponse, SessionUser } from '@shared/interfaces';

import Login from './login';

function createSessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    staffMemberId: '1',
    fullName: '',
    officialEmail: '',
    profileImageUrl: null,
    countryId: null,
    countryName: null,
    stateId: null,
    stateName: null,
    cityId: null,
    cityName: null,
    institutionId: '',
    institutionName: '',
    primaryRole: { roleId: 10, roleName: '', roleTypeId: 2, roleTypeName: '' },
    secondaryRoles: [],
    staffEmploymentTypeId: 0,
    staffEmploymentTypeName: '',
    departmentId: 0,
    departmentName: '',
    designationId: 0,
    designationName: '',
    isPasswordChangeRequired: false,
    isOnboard: false,
    ...overrides,
  };
}

function createLoginInfo(overrides: Partial<LoginInfo> = {}): LoginInfo {
  return {
    userType: 'InstitutionStaffMember',
    accessToken: 'tok',
    refreshToken: 'rtok',
    accessTokenExpiresAtUtc: '',
    refreshTokenExpiresAtUtc: '',
    user: createSessionUser(),
    ...overrides,
  };
}

/** A host session carries no `user` — identity lives in `hostUser` / `hostRole`. */
function createHostLoginInfo(overrides: Partial<LoginInfo> = {}): LoginInfo {
  return createLoginInfo({
    userType: 'Host',
    user: null as unknown as SessionUser,
    hostUser: {
      hostUserId: 6,
      name: 'Sujeet Jaiswara',
      loginId: 'sujeet@skolenza.in',
      email: 'sujeet@skolenza.in',
    },
    hostRole: { hostRoleId: 1, name: 'Super Admin' },
    ...overrides,
  });
}

function createLoginResponse(overrides: Partial<LoginResponse> = {}): LoginResponse {
  return {
    isSucceeded: true,
    message: 'ok',
    errors: [],
    data: createLoginInfo(),
    ...overrides,
  };
}

function createDevice(overrides: Partial<DetectDevice> = {}): DetectDevice {
  return { localIp: '10.0.0.1', publicIp: '1.2.3.4', deviceType: 1, userAgent: 'ua', ...overrides };
}

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  const authApiMock = {
    isAuthenticatedUser: vi.fn(),
    getDeviceInfo: vi.fn(),
    login: vi.fn(),
    setLoginInfo: vi.fn(),
    setTokens: vi.fn(),
    setClientIp: vi.fn(),
    setAuthRoleType: vi.fn(),
    redirectToDashboard: vi.fn(),
  };
  const authStoreMock = { setLoginData: vi.fn() };
  const permissionsStoreMock = { load: vi.fn(), loadFromStorage: vi.fn() };
  const commonMock = { showMessage: vi.fn() };
  const routerMock = { navigate: vi.fn() };

  function fillValidForm(): void {
    component['model'].set({ email: 'user@example.com', password: 'secret1' });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    authApiMock.isAuthenticatedUser.mockResolvedValue(undefined);
    authApiMock.getDeviceInfo.mockReturnValue(of(createDevice()));
    authApiMock.login.mockReturnValue(of(createLoginResponse()));
    routerMock.navigate.mockResolvedValue(true);
    authApiMock.redirectToDashboard.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthApi, useValue: authApiMock },
        { provide: AuthStore, useValue: authStoreMock },
        { provide: CurrentUserPermissionsStore, useValue: permissionsStoreMock },
        { provide: Common, useValue: commonMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit when the form is invalid', async () => {
    await component.login();

    expect(component['f'].email().touched()).toBe(true);
    expect(authApiMock.login).not.toHaveBeenCalled();
  });

  it('should call login with a request built from form and device info', async () => {
    component.ngOnInit();
    fillValidForm();

    await component.login();

    expect(authApiMock.login).toHaveBeenCalledWith(
      expect.objectContaining({
        loginId: 'user@example.com',
        password: 'secret1',
        ipAddressPublic: '1.2.3.4',
        ipAddressLocal: '10.0.0.1',
        loginDevice: 1,
      }),
    );
  });

  it('should show an error and not persist tokens when response is not succeeded', async () => {
    authApiMock.login.mockReturnValue(
      of(createLoginResponse({ isSucceeded: false, message: 'bad creds' })),
    );
    fillValidForm();

    await component.login();

    expect(commonMock.showMessage).toHaveBeenCalledWith('bad creds', 'error');
    expect(authApiMock.setTokens).not.toHaveBeenCalled();
  });

  it('should show an error when the session user is missing', async () => {
    authApiMock.login.mockReturnValue(
      of(
        createLoginResponse({
          message: 'no info',
          data: createLoginInfo({ user: null as unknown as SessionUser }),
        }),
      ),
    );
    fillValidForm();

    await component.login();

    expect(commonMock.showMessage).toHaveBeenCalledWith(
      'Your account has no role assigned. Contact your administrator.',
      'error',
    );
    expect(authApiMock.setTokens).not.toHaveBeenCalled();
  });

  it('should redirect to set-password when a password change is required', async () => {
    authApiMock.login.mockReturnValue(
      of(
        createLoginResponse({
          data: createLoginInfo({
            accessToken: 'reset-tok',
            user: createSessionUser({ isPasswordChangeRequired: true }),
          }),
        }),
      ),
    );
    fillValidForm();

    await component.login();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/set-password'], {
      queryParams: { token: 'reset-tok' },
    });
    expect(authApiMock.setTokens).not.toHaveBeenCalled();
  });

  it('should redirect to set-password even when the role type is missing', async () => {
    authApiMock.login.mockReturnValue(
      of(
        createLoginResponse({
          data: createLoginInfo({
            accessToken: 'reset-tok',
            user: createSessionUser({
              isPasswordChangeRequired: true,
              primaryRole: undefined as unknown as SessionUser['primaryRole'],
            }),
          }),
        }),
      ),
    );
    fillValidForm();

    await component.login();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/set-password'], {
      queryParams: { token: 'reset-tok' },
    });
    expect(authApiMock.setTokens).not.toHaveBeenCalled();
  });

  it('should persist session and redirect on successful login', async () => {
    fillValidForm();

    await component.login();

    expect(authApiMock.setLoginInfo).toHaveBeenCalled();
    expect(authApiMock.setTokens).toHaveBeenCalledWith('tok', 'rtok');
    expect(authApiMock.setAuthRoleType).toHaveBeenCalledWith(2);
    expect(authStoreMock.setLoginData).toHaveBeenCalled();
    expect(authApiMock.redirectToDashboard).toHaveBeenCalledWith(2);
  });

  it('should show an error when the dashboard navigation does not complete', async () => {
    authApiMock.redirectToDashboard.mockResolvedValue(false);
    fillValidForm();

    await component.login();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(commonMock.showMessage).toHaveBeenCalledWith(
      'Could not open your dashboard. Please try again.',
      'error',
    );
  });

  it('should reload permissions from the stored session', async () => {
    fillValidForm();

    await component.login();

    expect(permissionsStoreMock.loadFromStorage).toHaveBeenCalled();
  });

  it('should persist session and redirect to the host dashboard for a host login', async () => {
    authApiMock.login.mockReturnValue(of(createLoginResponse({ data: createHostLoginInfo() })));
    fillValidForm();

    await component.login();

    expect(authApiMock.setTokens).toHaveBeenCalledWith('tok', 'rtok');
    expect(authApiMock.setAuthRoleType).toHaveBeenCalledWith(0);
    expect(authStoreMock.setLoginData).toHaveBeenCalled();
    expect(authApiMock.redirectToDashboard).toHaveBeenCalledWith(0);
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(commonMock.showMessage).not.toHaveBeenCalled();
  });

  it('should reload permissions from storage for a host login', async () => {
    authApiMock.login.mockReturnValue(of(createLoginResponse({ data: createHostLoginInfo() })));
    fillValidForm();

    await component.login();

    expect(permissionsStoreMock.load).not.toHaveBeenCalled();
    expect(permissionsStoreMock.loadFromStorage).toHaveBeenCalled();
  });

  it('should show an error and reset saving state when login fails', async () => {
    authApiMock.login.mockReturnValue(throwError(() => new Error('boom')));
    fillValidForm();

    await component.login();

    expect(commonMock.showMessage).toHaveBeenCalledWith('boom', 'error');
    expect(component.isSaving()).toBe(false);
  });

  it('should reset saving state after a successful login', async () => {
    fillValidForm();

    await component.login();

    expect(component.isSaving()).toBe(false);
  });

  it('should show an error when device info lookup fails', () => {
    authApiMock.getDeviceInfo.mockReturnValue(throwError(() => new Error('dev down')));

    component.ngOnInit();

    expect(commonMock.showMessage).toHaveBeenCalledWith('dev down', 'error');
  });
});
