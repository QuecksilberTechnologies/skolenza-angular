import type { Page, Route } from '@playwright/test';

/**
 * Network mocks for the login flow. Shapes mirror the unit-test builders in
 * login.spec.ts. Routes are matched by glob so the real API host is irrelevant.
 */

export interface DeviceInfo {
  localIp: string;
  publicIp: string;
  deviceType: number;
  userAgent: string;
}

export function buildDevice(overrides: Partial<DeviceInfo> = {}): DeviceInfo {
  return { localIp: '10.0.0.1', publicIp: '1.2.3.4', deviceType: 1, userAgent: 'ua', ...overrides };
}

function buildSessionUser(overrides: Record<string, unknown> = {}) {
  return {
    staffMemberId: '1',
    fullName: '',
    officialEmail: '',
    profileImageUrl: '',
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

function buildLoginInfo(overrides: Record<string, unknown> = {}) {
  return {
    userType: 'InstitutionStaffMember',
    accessToken: 'tok',
    refreshToken: 'rtok',
    accessTokenExpiresAtUtc: '',
    refreshTokenExpiresAtUtc: '',
    user: buildSessionUser(),
    ...overrides,
  };
}

export interface LoginResponseOverrides {
  isSucceeded?: boolean;
  message?: string;
  errors?: unknown[];
  data?: Record<string, unknown> | null;
}

export function buildLoginResponse(overrides: LoginResponseOverrides = {}) {
  return {
    isSucceeded: true,
    message: 'ok',
    errors: [],
    data: buildLoginInfo(),
    ...overrides,
  };
}

/** Login success with an staffMember at the given roleTypeId. */
export function successResponseForRole(roleTypeId: number) {
  return buildLoginResponse({
    data: buildLoginInfo({
      user: buildSessionUser({
        primaryRole: { roleId: 10, roleName: '', roleTypeId, roleTypeName: '' },
      }),
    }),
  });
}

/** Login success for a host (platform super admin) — no `user`, identity in hostUser/hostRole. */
export function hostSuccessResponse() {
  return buildLoginResponse({
    data: buildLoginInfo({
      userType: 'Host',
      user: null,
      hostUser: {
        hostUserId: 6,
        name: 'Sujeet Jaiswara',
        loginId: 'sujeet@skolenza.in',
        email: 'sujeet@skolenza.in',
      },
      hostRole: { hostRoleId: 1, name: 'Super Admin' },
    }),
  });
}

/** The full host record the app hydrates from `/Host/get-host-user-by-id/{id}`. */
export function hostUserRecordResponse() {
  return {
    isSucceeded: true,
    message: '',
    errors: [],
    data: {
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
    },
  };
}

/** The user-menu dropdown tree, formerly delivered inside the login response. */
export function commonMenuResponse() {
  return {
    isSucceeded: true,
    message: '',
    errors: [],
    data: [
      {
        moduleId: 7,
        moduleName: 'Notifications',
        displayName: 'Notifications',
        urlPath: 'notification',
        imageIconWeb: null,
        imageIconMobile: null,
        isLeafNode: false,
        itemPriority: 0,
        children: [],
      },
      {
        moduleId: 6,
        moduleName: 'Profile',
        displayName: 'Profile',
        urlPath: 'profiles',
        imageIconWeb: null,
        imageIconMobile: null,
        isLeafNode: false,
        itemPriority: 0,
        children: [
          {
            moduleId: 8,
            moduleName: 'My-Profile',
            displayName: 'Profile',
            urlPath: 'profile',
            imageIconWeb: null,
            imageIconMobile: null,
            isLeafNode: true,
            itemPriority: 1,
            children: [],
          },
          {
            moduleId: 11,
            moduleName: 'Sign-Out',
            displayName: 'Sign out',
            urlPath: 'sign-out',
            imageIconWeb: null,
            imageIconMobile: null,
            isLeafNode: true,
            itemPriority: -1,
            children: [],
          },
        ],
      },
    ],
  };
}

/** Login success that forces the set-password redirect. */
export function passwordChangeResponse(token = 'reset-tok') {
  return buildLoginResponse({
    data: buildLoginInfo({
      accessToken: token,
      user: buildSessionUser({ isPasswordChangeRequired: true }),
    }),
  });
}

interface MockOptions {
  device?: DeviceInfo;
  loginResponse?: unknown;
  /** Delay (ms) before the login response resolves — used to assert the loading state. */
  delayMs?: number;
}

/**
 * Installs route handlers for device detection and login. Call before goto().
 * Dashboard guard XHRs after a successful redirect are stubbed with empty bodies
 * so navigation assertions don't hang.
 */
export async function mockAuth(page: Page, options: MockOptions = {}): Promise<void> {
  const { device = buildDevice(), loginResponse = buildLoginResponse(), delayMs = 0 } = options;

  // Fallback for any other backend call (e.g. dashboard/permission XHRs fired
  // after a successful redirect) so tests never hit the real API. Registered
  // first so the specific routes below take precedence.
  await page.route('**/skolenza-api.onrender.com/**', (route: Route) =>
    route.fulfill({ json: { isSucceeded: true, message: '', errors: [], data: [] } }),
  );

  await page.route('**/ClientInfo/detect-device', (route: Route) =>
    route.fulfill({ json: device }),
  );

  await page.route('**/CommonMenu', (route: Route) =>
    route.fulfill({ json: commonMenuResponse() }),
  );

  await page.route('**/Host/get-host-user-by-id/**', (route: Route) =>
    route.fulfill({ json: hostUserRecordResponse() }),
  );

  await page.route('**/NewLogin/login', async (route: Route) => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ json: loginResponse });
  });
}
