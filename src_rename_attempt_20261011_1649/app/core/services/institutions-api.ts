import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateInstitutionByHostReq,
  GetStaffMemberCodePatternRes,
  GetInstitutionDeleteDependenciesRes,
  GetInstitutionByIdRes,
  GetInstitutionOperationsResponse,
  GetInstitutionResponse,
  GetInstitutionsRequest,
  IInstitution,
  LogoVariantKey,
  RegisterInstitutionRequest,
  RegisterInstitutionResponse,
  RegisterInstitutionResponse,
  SaveStaffMemberCodePatternReq,
  SaveStaffMemberCodePatternRes,
  SyncPlanEntitlementsReq,
  InstitutionDeleteReq,
  InstitutionMutationRes,
  InstitutionStatusChangeReq,
  InstitutionVerifyResponse,
  UpdateInstitutionByHostReq,
  UpdateInstitutionModuleOperationsReq,
  UpdateInstitutionReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';
import { StorageApi } from './storage-api';

@Injectable({
  providedIn: 'root',
})
export class InstitutionsApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Institution`;

  readonly #http = inject(HttpClient);
  readonly #storageApi = inject(StorageApi);

  // Private signalsx
  readonly #institutions = signal<IInstitution[]>([]);
  readonly #isLoading = signal(false);
  readonly #brandLogos = signal<Record<LogoVariantKey, string | null>>({
    darkSmall: null,
    darkLarge: null,
    lightSmall: null,
    lightLarge: null,
    favicon: null,
  });

  // Public readonly signals for components
  readonly institutions = this.#institutions.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();
  readonly brandLogos = this.#brandLogos.asReadonly();

  constructor() {
    super();
  }

  async getBrandColor() {
    return (await this.#storageApi.getItem('brandColor')) as string;
  }

  async cacheBrandColor(value: string) {
    await this.#storageApi.setItem('brandColor', value);
  }

  async loadBrandLogos() {
    const stored = await this.#storageApi.getItem('brandLogos');
    if (stored && typeof stored === 'object') {
      this.#brandLogos.update((current) => ({
        ...current,
        ...(stored as Partial<Record<LogoVariantKey, string | null>>),
      }));
    }
  }

  async setBrandLogo(variant: LogoVariantKey, url: string | null) {
    const updated = { ...this.#brandLogos(), [variant]: url };
    this.#brandLogos.set(updated);
    await this.#storageApi.setItem('brandLogos', updated);
  }

  async clearBrandLogos() {
    this.#brandLogos.set({
      darkSmall: null,
      darkLarge: null,
      lightSmall: null,
      lightLarge: null,
      favicon: null,
    });
    await this.#storageApi.removeItem('brandLogos');
  }

  setInstitutions(data: IInstitution[]) {
    this.#institutions.set(data);
  }

  setIsLoading(value: boolean) {
    this.#isLoading.set(value);
  }

  // 1. Institution self-registration. The API retains create-institution as a legacy alias.
  registerInstitution(body: RegisterInstitutionRequest): Observable<RegisterInstitutionResponse> {
    return this.#http
      .post<RegisterInstitutionResponse>(`${this.#apiUrl}/create-institution`, body)
      .pipe(catchError(this.handleError<RegisterInstitutionResponse>('registerInstitution')));
  }

  /**
   * Host-side rich create. Unlike `create-institution` above, this one also writes the company profile,
   * the head-office location, the staff-member-code pattern and the outbound SMTP settings.
   *
   * The backend spells the path `new-tentant-…`; the typo is theirs and is reproduced verbatim.
   */
  createInstitutionByHost(body: CreateInstitutionByHostReq): Observable<RegisterInstitutionResponse> {
    return this.#http
      .post<RegisterInstitutionResponse>(`${this.#apiUrl}/new-tentant-creation-by-host`, body)
      .pipe(catchError(this.handleError<RegisterInstitutionResponse>('createInstitutionByHost')));
  }

  // 2. (company onboarding) Called after the user clicks the email verification button
  verifyEmail(token: string): Observable<InstitutionVerifyResponse> {
    return this.#http
      .post<InstitutionVerifyResponse>(`${this.#apiUrl}/verify`, { token })
      .pipe(catchError(this.handleError<InstitutionVerifyResponse>('verifyEmail')));
  }

  getInstitutions(req: GetInstitutionsRequest = {}): Observable<GetInstitutionResponse> {
    const url = `${this.#apiUrl}/get-all-institutions`;
    return this.#http
      .get<GetInstitutionResponse>(url, { params: this.makeHttpParams(req) })
      .pipe(catchError(this.handleError<GetInstitutionResponse>('getInstitutions')));
  }

  /** The list endpoint takes no id, so reading a single institution back has its own route. */
  getInstitutionById(institutionId: string): Observable<GetInstitutionByIdRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .get<GetInstitutionByIdRes>(`${this.#apiUrl}/get-institution-by-id`, { params })
      .pipe(catchError(this.handleError<GetInstitutionByIdRes>('getInstitutionById')));
  }

  getInstitutionOperations(isActive = true): Observable<GetInstitutionOperationsResponse> {
    const params = this.makeHttpParams({ IsActive: isActive });
    return this.#http
      .get<GetInstitutionOperationsResponse>(`${this.#apiUrl}/get-all-institution-operations`, { params })
      .pipe(catchError(this.handleError<GetInstitutionOperationsResponse>('getInstitutionOperations')));
  }

  /** The staff-member-code pattern is write-once at creation, so this is the only way to read it back. */
  getStaffMemberCodePattern(institutionId: string, isActive = true): Observable<GetStaffMemberCodePatternRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId, IsActive: isActive });
    return this.#http
      .get<GetStaffMemberCodePatternRes>(`${this.#apiUrl}/get-staff-member-code-pattern`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberCodePatternRes>('getStaffMemberCodePattern')));
  }

  /**
   * Host-side rich update, the counterpart to {@link createInstitutionByHost}. `ModuleId` /
   * `OperationId` are query params on this endpoint rather than body fields, and
   * `moduleOperationInterceptor` attaches them from the session's own navigation tree — this method
   * must not set them, or the interceptor leaves the call site's value alone.
   *
   * The path segment is spelled `{encryptedInstitutionId}` in swagger; the 8-character opaque `id` from
   * `get-institution-by-id` is what the app has and what it sends.
   */
  updateInstitutionByHost(institutionId: string, body: UpdateInstitutionByHostReq): Observable<InstitutionMutationRes> {
    return this.#http
      .put<InstitutionMutationRes>(`${this.#apiUrl}/new-institution-update-by-host/${institutionId}`, body)
      .pipe(catchError(this.handleError<InstitutionMutationRes>('updateInstitutionByHost')));
  }

  updateInstitution(body: UpdateInstitutionReq): Observable<InstitutionMutationRes> {
    return this.#http
      .post<InstitutionMutationRes>(`${this.#apiUrl}/update-institution`, body)
      .pipe(catchError(this.handleError<InstitutionMutationRes>('updateInstitution')));
  }

  updateModulesAndOperations(body: UpdateInstitutionModuleOperationsReq): Observable<InstitutionMutationRes> {
    return this.#http
      .post<InstitutionMutationRes>(`${this.#apiUrl}/update-modules-and-operations`, body)
      .pipe(catchError(this.handleError<InstitutionMutationRes>('updateModulesAndOperations')));
  }

  activateInstitution(body: InstitutionStatusChangeReq): Observable<InstitutionMutationRes> {
    return this.#http
      .post<InstitutionMutationRes>(`${this.#apiUrl}/activate-institution`, body)
      .pipe(catchError(this.handleError<InstitutionMutationRes>('activateInstitution')));
  }

  deactivateInstitution(body: InstitutionStatusChangeReq): Observable<InstitutionMutationRes> {
    return this.#http
      .post<InstitutionMutationRes>(`${this.#apiUrl}/deactivate-institution`, body)
      .pipe(catchError(this.handleError<InstitutionMutationRes>('deactivateInstitution')));
  }

  deleteInstitution(body: InstitutionDeleteReq): Observable<InstitutionMutationRes> {
    return this.#http
      .post<InstitutionMutationRes>(`${this.#apiUrl}/delete-institution`, body)
      .pipe(catchError(this.handleError<InstitutionMutationRes>('deleteInstitution')));
  }

  /** `/Institution/verify` consumes a token that was mailed out; this is what mails a fresh one.
   *  The institution rides the path and the endpoint declares no body - the permission ids ride the
   *  query string, via the explicit row this path owns in `module-operation-routes.ts`. */
  resendVerificationEmail(institutionId: string): Observable<InstitutionMutationRes> {
    return this.#http
      .post<InstitutionMutationRes>(`${this.#apiUrl}/${institutionId}/resend-verification-by-host`, null)
      .pipe(catchError(this.handleError<InstitutionMutationRes>('resendVerificationEmail')));
  }

  /** Additive and idempotent - it only fills in the entitlement rows the institution's active plan
   *  grants and the snapshot is missing. Nothing is duplicated or removed. */
  syncActivePlanEntitlements(body: SyncPlanEntitlementsReq): Observable<InstitutionMutationRes> {
    return this.#http
      .post<InstitutionMutationRes>(`${this.#apiUrl}/sync-active-plan-entitlements`, body)
      .pipe(catchError(this.handleError<InstitutionMutationRes>('syncActivePlanEntitlements')));
  }

  /**
   * Creates the institution's staff-member-code pattern. `confirm: false` previews, `confirm: true` commits
   * the previewed result and must carry that preview's `previewHash`.
   */
  addStaffMemberCodePattern(body: SaveStaffMemberCodePatternReq): Observable<SaveStaffMemberCodePatternRes> {
    return this.#http
      .post<SaveStaffMemberCodePatternRes>(`${this.#apiUrl}/add-staff-member-code-pattern`, body)
      .pipe(catchError(this.handleError<SaveStaffMemberCodePatternRes>('addStaffMemberCodePattern')));
  }

  /**
   * Changes an existing pattern and recodes every staffMember, the Admin included. Same
   * preview-then-confirm handshake as `addStaffMemberCodePattern`; a 409 on confirm means the preview
   * is stale and the caller has to take a fresh one.
   */
  updateStaffMemberCodePattern(
    body: SaveStaffMemberCodePatternReq,
  ): Observable<SaveStaffMemberCodePatternRes> {
    return this.#http
      .put<SaveStaffMemberCodePatternRes>(`${this.#apiUrl}/update-staff-member-code-pattern`, body)
      .pipe(catchError(this.handleError<SaveStaffMemberCodePatternRes>('updateStaffMemberCodePattern')));
  }

  /** What a delete would take with it. Read before the confirm dialog, never after. */
  getInstitutionDeleteDependencies(id: string): Observable<GetInstitutionDeleteDependenciesRes> {
    return this.#http
      .get<GetInstitutionDeleteDependenciesRes>(`${this.#apiUrl}/${id}/delete-dependencies`)
      .pipe(
        catchError(this.handleError<GetInstitutionDeleteDependenciesRes>('getInstitutionDeleteDependencies')),
      );
  }
}
