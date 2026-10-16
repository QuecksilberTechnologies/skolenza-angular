import { FormControl } from '@angular/forms';

export interface RegisterInstitutionRequest {
  subscriptionPlanId: number;
  institutionTypeId: number;
  institutionName: string;
  institutionCode: string;
  staffCodePrefix: string;
  includeYear?: boolean;
  includeMonth?: boolean;
  includeDepartment?: boolean;
  separator?: string;
  runningNumberLength?: string;
  institutionEmailDomain: string;
  genderId: number;
  institutionEmail: string;
  contactPersonName: string;
  contactNumber: string;
  countryId: number;
}

export interface RegisterInstitutionResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[] | null;
  errorCode?: string;
  data: RegisterInstitutionData | null;
}

export interface RegisterInstitutionData {
  success: boolean;
  emailSent: boolean;
  message: string;
}

/** Legacy host-management response alias retained until that flow is migrated. */
export type RegisterInstitutionResponse = RegisterInstitutionResponse;

export interface InstitutionVerifyResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionVerifyData;
}

export interface InstitutionVerifyData {
  staffMemberId: number;
  institutionId: number;
  userId: string;
  expiry: Date;
  isExpired: boolean;
}

// Forgot password
export interface ForgotForm {
  email: FormControl<string>;
}

export interface ForgotPasswordRequest {
  loginId: string;
}

export interface ForgotPasswordResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ForgotPasswordResponseData;
}

export interface ForgotPasswordResponseData {
  emailResendAfterMinute: number;
  message: string;
}

export interface ValidateForgotPassOtpReq {
  loginId: string;
  otp: string;
}
