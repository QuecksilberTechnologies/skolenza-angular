import { LoginInfo } from '@shared/interfaces';

// roleTypeId: 0=Host, 1=Admin, 2=StaffMember, 3=Manager
export const HOST_ROLE_TYPE_ID = 0;
export const STAFF_MEMBER_ROLE_TYPE_ID = 2;

/** Host logins carry `userType: 'Host'` (mirrors the JWT `UserType` claim). */
export const isHostLogin = (loginInfo?: LoginInfo | null): boolean =>
  loginInfo?.userType === 'Host';

/** Single source of truth for the session's roleTypeId across guard, menu and redirect. */
export const resolveRoleTypeId = (loginInfo?: LoginInfo | null): number | undefined =>
  loginInfo?.user?.primaryRole?.roleTypeId ??
  (isHostLogin(loginInfo) ? HOST_ROLE_TYPE_ID : undefined);

/** Gates the admin-only actions. `primaryRole` is optional on the payload, so an
 *  unresolved role must read as "staffMember" — never as an unlocked admin view. */
export const isAdminSession = (loginInfo?: LoginInfo | null): boolean =>
  (resolveRoleTypeId(loginInfo) ?? STAFF_MEMBER_ROLE_TYPE_ID) !== STAFF_MEMBER_ROLE_TYPE_ID;
