import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AddRoleResponse,
  AddUpdateRoleRequest,
  AssignUserRolesReq,
  AssignUserRolesRes,
  BulkImportJobRequest,
  BulkImportJobResponse,
  BulkImportJobsRequest,
  BulkImportJobsResponse,
  BulkImportPreviewResponse,
  GetAllUserRolesReq,
  GetAllUserRolesRes,
  GetRoleOptionReq,
  GetRoleTypeOptionsResponse,
  GetRolePermissionsResponse,
  GetRolesReq,
  GetRolesResponse,
  Role,
  RoleType,
  SaveRolePermissionsRequest,
  SaveRolePermissionsResponse,
  UpdateRoleResponse,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class RolesApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Role`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #roles = signal<Role[]>([]);
  readonly #roleTypes = signal<RoleType[]>([]);
  readonly #totalRecords = signal<number>(0);
  readonly #isLoadingRoles = signal<boolean>(false);

  // Public readonly signals for components
  readonly roles = this.#roles.asReadonly();
  readonly roleTypes = this.#roleTypes.asReadonly();
  readonly totalRecords = this.#totalRecords.asReadonly();
  readonly isLoadingRoles = this.#isLoadingRoles.asReadonly();

  constructor() {
    super();
  }

  setIsLoadingRoles(value: boolean) {
    this.#isLoadingRoles.set(value);
  }

  setRoles(data: Role[]) {
    this.#roles.set(data);
  }

  setRoleTypes(data: RoleType[]) {
    this.#roleTypes.set(data);
  }

  setTotalRecords(value: number) {
    this.#totalRecords.set(value);
  }

  getRole(id: number): Role | undefined {
    return this.#roles().find((role) => role.id === id);
  }

  addRoleSignal(value: AddUpdateRoleRequest) {
    const roles = [...this.#roles()];
    const role: Role = {
      id: Math.max(0, ...roles.map((r) => r.id ?? 0)) + 1,
      roleName: value.roleName,
      roleType: value.roleType,
      roleTypeName: this.roleTypes().find((t) => t.id === value.roleType)?.name ?? '',
      remark: value.remark ?? '',
      isActive: value.isActive,
    };
    roles.unshift(role);
    this.setRoles(roles);
  }

  updateRoleSignal(value: AddUpdateRoleRequest) {
    const roles = [...this.#roles()];
    const index = roles.findIndex((x) => x.id === value.id);
    if (index > -1) {
      roles[index] = {
        ...roles[index],
        roleName: value.roleName,
        roleType: value.roleType,
        roleTypeName: this.roleTypes().find((x) => x.id === value.roleType)?.name ?? '',
        remark: value.remark,
        isActive: value.isActive,
      };
      this.setRoles(roles);
    }
  }

  removeRoleSignal(id: number) {
    const updatedRoles = this.#roles().filter((role) => role.id !== id);
    this.setRoles(updatedRoles);
  }

  // Role CRUD
  addRole(body: AddUpdateRoleRequest): Observable<AddRoleResponse> {
    return this.#http
      .post<AddRoleResponse>(`${this.#apiUrl}/add`, body)
      .pipe(catchError(this.handleError<AddRoleResponse>('addRole')));
  }

  getRoles(req: GetRolesReq): Observable<GetRolesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetRolesResponse>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetRolesResponse>('getRoles')));
  }

  getRoleOptions(req: GetRoleOptionReq): Observable<GetRolesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetRolesResponse>(`${this.#apiUrl}/option`, { params })
      .pipe(catchError(this.handleError<GetRolesResponse>('getRoleOptions')));
  }

  getRoleTypeOptions(): Observable<GetRoleTypeOptionsResponse> {
    return this.#http
      .get<GetRoleTypeOptionsResponse>(`${this.#apiUrl}/type-options`)
      .pipe(catchError(this.handleError<GetRoleTypeOptionsResponse>('getRoleTypeOptions')));
  }

  updateRole(body: AddUpdateRoleRequest): Observable<UpdateRoleResponse> {
    return this.#http
      .put<UpdateRoleResponse>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<UpdateRoleResponse>('updateRole')));
  }

  deleteRole(id: number): Observable<GetRolesResponse> {
    const params = this.makeHttpParams({ Id: id });
    return this.#http
      .delete<GetRolesResponse>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetRolesResponse>('deleteRole')));
  }

  getRoleBasedPermissions(roleId: number): Observable<GetRolePermissionsResponse> {
    const params = this.makeHttpParams({ RoleId: roleId });
    return this.#http
      .get<GetRolePermissionsResponse>(
        `${environment.apiUrl}/UserModuleRolePermission/get-role-based-permissions`,
        { params },
      )
      .pipe(catchError(this.handleError<GetRolePermissionsResponse>('getRoleBasedPermissions')));
  }

  saveRolePermissions(body: SaveRolePermissionsRequest): Observable<SaveRolePermissionsResponse> {
    return this.#http
      .post<SaveRolePermissionsResponse>(
        `${environment.apiUrl}/UserModuleRolePermission/assign-role-permissions`,
        body,
      )
      .pipe(catchError(this.handleError<SaveRolePermissionsResponse>('saveRolePermissions')));
  }

  // UserRole - multi-role assignment
  getAllUserRoles(req: GetAllUserRolesReq): Observable<GetAllUserRolesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetAllUserRolesRes>(`${environment.apiUrl}/UserRole/get-all-user-roles`, { params })
      .pipe(catchError(this.handleError<GetAllUserRolesRes>('getAllUserRoles')));
  }

  assignRolesToUser(body: AssignUserRolesReq): Observable<AssignUserRolesRes> {
    return this.#http
      .post<AssignUserRolesRes>(`${environment.apiUrl}/UserRole/assign-roles-to-user`, body)
      .pipe(catchError(this.handleError<AssignUserRolesRes>('assignRolesToUser')));
  }

  // Role bulk import. `ModuleId` / `OperationId` are stamped by `moduleOperationInterceptor` —
  // `Add` on the writes, `View` on the reads (see `MODULE_OPERATION_ROUTES`).
  previewBulkImport(body: FormData): Observable<BulkImportPreviewResponse> {
    return this.#http
      .post<BulkImportPreviewResponse>(`${this.#apiUrl}/bulk/preview`, body)
      .pipe(catchError(this.handleError<BulkImportPreviewResponse>('previewBulkImport')));
  }

  confirmBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/confirm`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('confirmBulkImport')));
  }

  getBulkImportJob(jobId: string): Observable<BulkImportJobResponse> {
    return this.#http
      .get<BulkImportJobResponse>(`${this.#apiUrl}/bulk/jobs/${jobId}`)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('getBulkImportJob')));
  }

  /**
   * The caller's own imports of this master, newest first. Jobs are scoped to the institution *and* the
   * user who created them, so one admin never sees another's. `PageSize` is capped at 100.
   */
  listBulkImportJobs(req: BulkImportJobsRequest = {}): Observable<BulkImportJobsResponse> {
    const params = this.makeHttpParams({ PageNumber: req.pageNumber, PageSize: req.pageSize });
    return this.#http
      .get<BulkImportJobsResponse>(`${this.#apiUrl}/bulk/jobs`, { params })
      .pipe(catchError(this.handleError<BulkImportJobsResponse>('listBulkImportJobs')));
  }

  /** Requeues a saved job's failed and incomplete rows; committed rows are never inserted again. */
  retryBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/retry`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('retryBulkImport')));
  }

  /**
   * Advisory: `Draft`/`Queued` stop outright, `Running` stops at the next batch boundary, and a
   * terminal job is left alone. Read the returned status - a 200 is not proof of a cancellation.
   */
  cancelBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/cancel`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('cancelBulkImport')));
  }

  downloadBulkImportTemplate(): Observable<Blob> {
    return this.#http
      .get(`${this.#apiUrl}/bulk/template`, { responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportTemplate')));
  }

  downloadBulkImportReport(jobId: string): Observable<Blob> {
    return this.#http
      .get(`${this.#apiUrl}/bulk/jobs/${jobId}/report`, { responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportReport')));
  }
}
