import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateNewPasswordReq,
  DetectDevice,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginInfo,
  LoginRequest,
  LoginResponse,
  ResendCredentialReq,
  ResendCredentialRes,
  UpdateLoginPasswordReq,
  ValidateForgotPassOtpReq,
} from '@shared/interfaces';
import { GetRefreshTokenReq, GetRefreshTokenRes } from '@shared/interfaces/auth/token';
import { isJwtExpired } from '@shared/utilities/jwt';
import { resolveRoleTypeId } from '@shared/utilities/login-info';

import { BaseService } from './base-service';
import { StorageApi } from './storage-api';

@Injectable({
  providedIn: 'root',
})
export class AuthApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Auth`;
  readonly #newLoginUrl = `${environment.apiUrl}/NewLogin`;

  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #storageApi = inject(StorageApi);

  // Private signals
  readonly #authRoleType = signal<number>(0);

  // Public readonly signals for components
  readonly authRoleType = this.#authRoleType.asReadonly();

  constructor() {
    super();
  }

  getAuthId(): string | null {
    try {
      const stored = localStorage.getItem(this.#storageApi.prefixKey('loginInfo'));
      if (!stored) return null;
      const loginInfo = JSON.parse(stored);
      return loginInfo?.user?.staffMemberId ?? null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(this.#storageApi.prefixKey('token'));
    } catch {
      return null;
    }
  }

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.#storageApi.prefixKey('refreshToken'));
    } catch {
      return null;
    }
  }

  getClientIp(): string {
    try {
      return localStorage.getItem(this.#storageApi.prefixKey('clientIp')) ?? '';
    } catch {
      return '';
    }
  }

  setClientIp(ip?: string) {
    try {
      localStorage.setItem(this.#storageApi.prefixKey('clientIp'), ip ?? '');
    } catch (error) {
      console.error('Error storing client IP in localStorage:', error);
    }
  }

  async getLoginInfo(): Promise<LoginInfo> {
    return (await this.#storageApi.getItem('loginInfo')) as LoginInfo;
  }

  async setLoginInfo(loginInfo: LoginInfo) {
    this.#storageApi.setItem('loginInfo', loginInfo);
  }

  setTokens(token: string, refreshToken: string) {
    try {
      localStorage.setItem(this.#storageApi.prefixKey('token'), token);
      localStorage.setItem(this.#storageApi.prefixKey('refreshToken'), refreshToken);
    } catch (error) {
      console.error('Error storing tokens in localStorage:', error);
    }
  }

  setAuthRoleType(value: number) {
    this.#authRoleType.set(value);
  }

  async isAuthenticatedUser() {
    const token = this.isAuthenticated();
    if (token) {
      const loginInfo = await this.getLoginInfo();
      await this.redirectToDashboard(resolveRoleTypeId(loginInfo));
    }
  }

  /**
   * An expired access token is still "authenticated" as long as a refresh token is around —
   * the auth interceptor renews it before the first request goes out.
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    return !isJwtExpired(token) || !!this.getRefreshToken();
  }

  /** Resolves `false` when the navigation is cancelled or the lazy chunk fails to load. */
  redirectToDashboard(roleTypeId?: number): Promise<boolean> {
    const role = roleTypeId ?? this.#authRoleType();
    switch (role) {
      case 0:
        return this.#router.navigate(['/app/host-dashboard']);

      // Admin(1) / Manger(3)
      case 1:
      case 3:
        return this.#router.navigate(['/app/admin-dashboard']);

      // StaffMember
      case 2:
        return this.#router.navigate(['/app/dashboard']);

      default:
        return this.#router.navigate(['/app/dashboard']);
    }
  }

  async logout() {
    this.#storageApi.clearSensitive();
    await this.#router.navigate(['/auth/login']);
  }

  // APIs =======================

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.#http
      .post<LoginResponse>(`${this.#newLoginUrl}/login`, body, {
        context: this.handleHttpContext(true),
      })
      .pipe(catchError(this.handleError<LoginResponse>('login')));
  }

  getDeviceInfo(): Observable<DetectDevice> {
    return this.#http
      .get<DetectDevice>(`${environment.apiUrl}/ClientInfo/detect-device`, {
        context: this.handleHttpContext(true),
      })
      .pipe(catchError(this.handleError<DetectDevice>('getDeviceInfo')));
  }

  // Skip auth interceptor to prevent infinite 401 refresh loop
  refreshToken(body: GetRefreshTokenReq): Observable<GetRefreshTokenRes> {
    return this.#http.post<GetRefreshTokenRes>(`${this.#apiUrl}/refresh-token`, body, {
      context: this.handleHttpContext(true),
    });
  }

  // 1. (forgot) - Forgot password
  forgotPassword(body: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.#http
      .post<ForgotPasswordResponse>(`${this.#apiUrl}/forgot-password`, body)
      .pipe(catchError(this.handleError<ForgotPasswordResponse>('forgotPassword')));
  }

  // 2. (forgot) - Validate forgot passowrd otp
  validateForgotPassOtp(body: ValidateForgotPassOtpReq): Observable<ForgotPasswordResponse> {
    return this.#http
      .post<ForgotPasswordResponse>(`${this.#apiUrl}/validate-forgot-password-otp`, body)
      .pipe(catchError(this.handleError<ForgotPasswordResponse>('validateForgotPassOtp')));
  }

  // 3. (company onboarding) Change register password
  updateLoginPassword(body: UpdateLoginPasswordReq): Observable<unknown> {
    return this.#http
      .post<unknown>(`${this.#apiUrl}/update-login-password`, body)
      .pipe(catchError(this.handleError<unknown>('updateLoginPassword')));
  }

  // This will use when admin create new user
  createNewLoginPassword(body: CreateNewPasswordReq): Observable<ForgotPasswordResponse> {
    return this.#http
      .post<ForgotPasswordResponse>(`${this.#apiUrl}/create-new-password`, body)
      .pipe(catchError(this.handleError<ForgotPasswordResponse>('createNewLoginPassword')));
  }

  resendCredential(body: ResendCredentialReq): Observable<ResendCredentialRes> {
    return this.#http
      .post<ResendCredentialRes>(`${this.#apiUrl}/resend-credential`, body)
      .pipe(catchError(this.handleError<ResendCredentialRes>('resendCredential')));
  }
}
