import { LoginInfo } from '@shared/interfaces';

/** Host is a platform login and is not part of the Institution RoleType catalogue. */
export const HOST_ROLE_TYPE_ID = 0;

/**
 * Stable IDs published by GET /api/Role/type-options.
 * Labels and selectable options must still come from that endpoint.
 */
export enum InstitutionRoleTypeId {
  InstitutionAdministrator = 1,
  StaffMember = 2,
  StaffManager = 3,
  ExternalUser = 4,
  Student = 5,
  ParentGuardian = 6,
}

/** Host logins carry `userType: 'Host'` (mirrors the JWT `UserType` claim). */
export const isHostLogin = (loginInfo?: LoginInfo | null): boolean =>
  loginInfo?.userType === 'Host';

/** Single source of truth for the session's roleTypeId across guard, menu and redirect. */
export const resolveRoleTypeId = (
  loginInfo?: LoginInfo | null,
): number | undefined =>
  loginInfo?.user?.primaryRole?.roleTypeId ??
  (isHostLogin(loginInfo) ? HOST_ROLE_TYPE_ID : undefined);

/** Gates the admin-only actions. `primaryRole` is optional on the payload, so an
 *  unresolved role must read as "staffMember" — never as an unlocked admin view. */
export const isAdminSession = (loginInfo?: LoginInfo | null): boolean =>
  (resolveRoleTypeId(loginInfo) ?? InstitutionRoleTypeId.StaffMember) !==
  InstitutionRoleTypeId.StaffMember;
