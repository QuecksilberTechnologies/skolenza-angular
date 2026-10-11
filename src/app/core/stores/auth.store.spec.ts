import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CommonMenuApi } from '@core/services/common-menu-api';
import { HostApi } from '@core/services/host-api';
import {
  CommonMenuItem,
  CommonMenuResponse,
  HostUser,
  LoginInfo,
  SessionUser,
} from '@shared/interfaces';

import { AuthStore } from './auth.store';

function createLoginInfo(overrides: Partial<LoginInfo> = {}): LoginInfo {
  return {
    userType: 'InstitutionStaffMember',
    accessToken: 'tok',
    refreshToken: 'rtok',
    accessTokenExpiresAtUtc: '',
    refreshTokenExpiresAtUtc: '',
    user: {
      fullName: 'StaffMember One',
      officialEmail: 'staffMember@institution.com',
      institutionName: 'TechNova',
      primaryRole: { roleId: 10, roleName: 'Manager', roleTypeId: 3, roleTypeName: 'Manager' },
    } as SessionUser,
    ...overrides,
  };
}

/** A host session carries no `user` — identity lives in `hostUser` / `hostRole`. */
function createHostLoginInfo(): LoginInfo {
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
  });
}

const hydratedHostUser = {
  id: 6,
  hostRoleId: 1,
  hostRoleName: 'Super Admin',
  name: 'Sujeet Jaiswara',
  loginId: 'sujeet@skolenza.in',
  email: 'sujeet@skolenza.in',
  mobileNumber: '9122323421',
  isActive: true,
  addedDateTime: '2026-08-10T04:54:31Z',
  updatedDateTime: null,
} as HostUser;

const commonMenu = [
  { moduleId: 1, children: [] },
  {
    moduleId: 2,
    moduleName: 'Profile',
    children: [
      { moduleId: 11, moduleName: 'Sign-Out', displayName: 'Sign out', urlPath: 'sign-out' },
      { moduleId: 3, moduleName: 'My-Profile', displayName: 'Profile', urlPath: 'profile' },
    ],
  },
] as unknown as CommonMenuItem[];

const flattenedCommonMenu = [
  {
    moduleId: 39,
    moduleName: 'My-Profile',
    displayName: 'Profile',
    urlPath: 'profile',
    children: [],
  },
  {
    moduleId: 40,
    moduleName: 'Help-Support',
    displayName: 'Help & Support',
    urlPath: 'help-support',
    children: [],
  },
  {
    moduleId: 41,
    moduleName: 'Sign-Out',
    displayName: 'Sign out',
    urlPath: 'sign-out',
    children: [],
  },
  {
    moduleId: 42,
    moduleName: 'Settings',
    displayName: 'Settings',
    urlPath: 'setting',
    children: [],
  },
  {
    moduleId: 44,
    moduleName: 'Notification',
    displayName: 'Notification',
    urlPath: 'common-menu/notifications/notification',
    children: [],
  },
] as unknown as CommonMenuItem[];

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  const commonMenuApiMock = {
    getCommonMenu: vi.fn((): Observable<CommonMenuResponse> =>
      of({ isSucceeded: true, message: '', errors: [], data: commonMenu }),
    ),
  };
  const hostApiMock = {
    getHostUserById: vi.fn(() =>
      of({ isSucceeded: true, message: '', errors: [], data: hydratedHostUser }),
    ),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CommonMenuApi, useValue: commonMenuApiMock },
        { provide: HostApi, useValue: hostApiMock },
      ],
    });
    store = TestBed.inject(AuthStore);
  });

  it('should build the host user menu from CommonMenu too', async () => {
    store.setLoginData(createHostLoginInfo());
    await Promise.resolve();

    expect(commonMenuApiMock.getCommonMenu).toHaveBeenCalled();
    expect(store.userMenuItems().map((item) => item.displayName)).toEqual(['Profile', 'Sign out']);
  });

  it('should build the user menu from the migrated two-level CommonMenu shape', async () => {
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(
      of({ isSucceeded: true, message: '', errors: [], data: flattenedCommonMenu }),
    );

    store.setLoginData(createHostLoginInfo());
    await Promise.resolve();

    expect(store.userMenuItems().map((item) => item.displayName)).toEqual([
      'Profile',
      'Help & Support',
      'Settings',
      'Sign out',
    ]);
  });

  it('should resolve a host to roleTypeId 0', () => {
    store.setLoginData(createHostLoginInfo());

    expect(store.roleTypeId()).toBe(0);
    expect(store.isHost()).toBe(true);
  });

  it('should show host identity from the session before hydration finishes', () => {
    store.setLoginData(createHostLoginInfo());

    expect(store.staffMemberFullName()).toBe('Sujeet Jaiswara');
    expect(store.officialEmail()).toBe('sujeet@skolenza.in');
    expect(store.userPrimaryRoleName()).toBe('Super Admin');
    expect(store.institutionName()).toBe('Skolenza Host');
  });

  it('should hydrate the full host record from HostApi', async () => {
    store.setLoginData(createHostLoginInfo());
    await Promise.resolve();

    expect(hostApiMock.getHostUserById).toHaveBeenCalledWith(6);
    expect(store.hostUser()?.id).toBe(6);
    expect(store.hostUser()?.mobileNumber).toBe('9122323421');
    expect(store.hostUser()?.isActive).toBe(true);
  });

  it('should not hydrate a host record for a institution login', () => {
    store.setLoginData(createLoginInfo());

    expect(hostApiMock.getHostUserById).not.toHaveBeenCalled();
    expect(store.hostUser()).toBeNull();
  });

  it('should expose the staffMember identity', () => {
    store.setLoginData(createLoginInfo());

    expect(store.staffMemberFullName()).toBe('StaffMember One');
    expect(store.userPrimaryRoleName()).toBe('Manager');
    expect(store.institutionName()).toBe('TechNova');
    expect(store.roleTypeId()).toBe(3);
    expect(store.isHost()).toBe(false);
  });

  it('should use the CommonMenu profile branch for an staffMember user menu', async () => {
    store.setLoginData(createLoginInfo());
    await Promise.resolve();

    expect(commonMenuApiMock.getCommonMenu).toHaveBeenCalled();
    // Sign-Out comes first in the response; the dropdown styles the closing row as logout.
    expect(store.userMenuItems().map((item) => item.displayName)).toEqual(['Profile', 'Sign out']);
  });

  it('should fall back to a logout item when CommonMenu has no profile branch', async () => {
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(
      of({ isSucceeded: true, message: '', errors: [], data: [] as CommonMenuItem[] }),
    );

    store.setLoginData(createLoginInfo());
    await Promise.resolve();

    // The dropdown renders its last entry as logout — an empty menu would strip sign-out.
    expect(store.userMenuItems().map((item) => item.displayName)).toEqual(['Sign out']);
  });

  it('should fall back to a logout item when CommonMenu fails', async () => {
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(
      throwError(() => new Error('CommonMenu unavailable')),
    );

    store.setLoginData(createLoginInfo());
    await Promise.resolve();

    expect(store.userMenuItems().map((item) => item.displayName)).toEqual(['Sign out']);
  });

  it('should ignore a CommonMenu response that lands after logout', async () => {
    const menu$ = new Subject<CommonMenuResponse>();
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(menu$);

    store.setLoginData(createLoginInfo());
    store.clearLoginData();

    menu$.next({ isSucceeded: true, message: '', errors: [], data: [] as CommonMenuItem[] });
    menu$.complete();
    await Promise.resolve();

    // Cleared back to the seeded logout-only menu, not to the late response.
    expect(store.userMenuItems().map((item) => item.displayName)).toEqual(['Sign out']);
    expect(store.isLoggedIn()).toBe(false);
  });
  it('should persist a host rename into the stored session', async () => {
    const session = createHostLoginInfo();
    localStorage.setItem('skolenza/loginInfo', JSON.stringify(session));
    store.setLoginData(session);
    await Promise.resolve();

    await store.updateHostUserInfo({ name: 'Sujeet K Jaiswara' });

    expect(store.staffMemberFullName()).toBe('Sujeet K Jaiswara');
    // Without the write-back the header reverts to the old name on the next refresh.
    const stored = JSON.parse(localStorage.getItem('skolenza/loginInfo') ?? '{}');
    expect(stored.hostUser.name).toBe('Sujeet K Jaiswara');
  });
  it('should offer sign out before CommonMenu resolves', () => {
    const menu$ = new Subject<CommonMenuResponse>();
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(menu$);

    store.setLoginData(createLoginInfo());

    // Nothing has resolved yet — the dropdown must still have a way out.
    expect(store.userMenuItems().map((item) => item.displayName)).toEqual(['Sign out']);
  });

  it('should report the user menu as busy until CommonMenu resolves', async () => {
    const menu$ = new Subject<CommonMenuResponse>();
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(menu$);

    store.setLoginData(createLoginInfo());
    expect(store.isUserMenuLoading()).toBe(true);

    menu$.next({ isSucceeded: true, message: '', errors: [], data: commonMenu });
    menu$.complete();
    await Promise.resolve();

    expect(store.isUserMenuLoading()).toBe(false);
  });

  it('should clear the busy flag when CommonMenu fails', async () => {
    commonMenuApiMock.getCommonMenu.mockReturnValueOnce(
      throwError(() => new Error('CommonMenu unavailable')),
    );

    store.setLoginData(createLoginInfo());
    await Promise.resolve();

    // A failed menu must not leave the dropdown stuck on skeleton rows.
    expect(store.isUserMenuLoading()).toBe(false);
  });
});
