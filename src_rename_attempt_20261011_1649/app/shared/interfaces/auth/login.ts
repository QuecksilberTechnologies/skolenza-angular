import { FormControl } from '@angular/forms';

export interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

export interface DetectDevice {
  localIp: string;
  publicIp: string;
  deviceType: number;
  userAgent: string;
}

export interface LoginRequest {
  loginId: string;
  password: string;
  macAddress: string;
  ipAddressPublic: string;
  ipAddressLocal: string;
  latitude: number;
  longitude: number;
  loginDevice?: number;
}

export interface LoginResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: LoginInfo | null;
}

/** The session returned by `POST /NewLogin/login` and persisted under `loginInfo`. */
export interface LoginInfo {
  /** `'InstitutionStaffMember'` for institution logins, `'Host'` for the platform super admin. */
  userType: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  refreshTokenExpiresAtUtc: string;
  /** Institution logins only — absent on a host session, which reads `hostUser` instead. */
  user?: SessionUser;
  /** Host logins only — a thin identity; the full record comes from `/Host/get-host-user-by-id`. */
  hostUser?: SessionHostUser;
  hostRole?: SessionHostRole;
}

export interface SessionHostUser {
  hostUserId: number;
  name: string;
  loginId: string;
  email: string;
}

export interface SessionHostRole {
  hostRoleId: number;
  name: string;
}

export interface SessionUser {
  staffMemberId: string;
  fullName: string;
  officialEmail: string;
  profileImageUrl: string | null;
  countryId: number | null;
  countryName: string | null;
  stateId: number | null;
  stateName: string | null;
  cityId: number | null;
  cityName: string | null;
  institutionId: string;
  institutionName: string;
  primaryRole?: SessionRole;
  secondaryRoles: SessionRole[];
  staffEmploymentTypeId: number;
  staffEmploymentTypeName: string;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationName: string;
  isPasswordChangeRequired: boolean;
  isOnboard: boolean;
}

export interface SessionRole {
  roleId: number;
  roleName: string;
  roleTypeId: number;
  roleTypeName: string;
}

export interface HostUser {
  id: number;
  hostRoleId: number;
  hostRoleName: string;
  name: string;
  loginId: string;
  email: string;
  mobileNumber: string;
  isActive: boolean;
  addedDateTime: string;
  updatedDateTime: string | null;
  isUpdatingStatus?: boolean; // NG
}

export interface HostRole {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  addedDateTime: string;
  updatedDateTime: string | null;
  isUpdatingStatus?: boolean; // NG
}

/** `GET /CommonMenu` — the user-menu dropdown tree, formerly `LoginInfo.commonItems`. */
export interface CommonMenuResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: CommonMenuItem[];
}

export interface CommonMenuItem {
  moduleId: number;
  moduleName: string;
  displayName: string;
  urlPath: string;
  imageIconWeb: string | null;
  imageIconMobile: string | null;
  isLeafNode: boolean;
  itemPriority: number;
  children: CommonMenuItem[];
}

export interface UpdateLoginPasswordReq {
  loginId: string;
  userStaffMemberId: string;
  staffMemberId: string;
  newPassword: string;
  oldPassword: string;
}

export interface ResendCredentialReq {
  userLoginId: string;
}

export interface ResendCredentialRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ResendCredential;
}

export interface ResendCredential {
  urlLink: string;
}
