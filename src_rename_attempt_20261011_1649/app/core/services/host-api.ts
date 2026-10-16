import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  ChangeHostUserPasswordRequest,
  CreateHostRoleRequest,
  CreateHostUserRequest,
  DeleteHostRoleRequest,
  DeleteHostUserRequest,
  GetHostModulesResponse,
  GetHostRoleModulePermissionsResponse,
  GetHostRoleResponse,
  GetHostRolesResponse,
  GetHostUserResponse,
  GetHostUsersRequest,
  GetHostUsersResponse,
  HostResponse,
  ResetHostUserPasswordRequest,
  SaveHostRoleModulePermissionsRequest,
  UpdateHostRoleRequest,
  UpdateHostUserRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class HostApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Platform`;
  readonly #rolePermissionApiUrl = `${environment.apiUrl}/PlatformRolePermission`;
  readonly #http = inject(HttpClient);

  getHostUsers(req: GetHostUsersRequest): Observable<GetHostUsersResponse> {
    return this.#http
      .get<GetHostUsersResponse>(`${this.#apiUrl}/get-all-host-users`, {
        params: this.makeHttpParams(req),
      })
      .pipe(catchError(this.handleError<GetHostUsersResponse>('getHostUsers')));
  }

  getHostUserById(id: number): Observable<GetHostUserResponse> {
    return this.#http
      .get<GetHostUserResponse>(`${this.#apiUrl}/get-host-user-by-id/${id}`)
      .pipe(catchError(this.handleError<GetHostUserResponse>('getHostUserById')));
  }

  getHostRoles(): Observable<GetHostRolesResponse> {
    return this.#http
      .get<GetHostRolesResponse>(`${this.#apiUrl}/get-all-host-roles`)
      .pipe(catchError(this.handleError<GetHostRolesResponse>('getHostRoles')));
  }

  getHostRoleById(id: number): Observable<GetHostRoleResponse> {
    return this.#http
      .get<GetHostRoleResponse>(`${this.#apiUrl}/get-host-role-by-id/${id}`)
      .pipe(catchError(this.handleError<GetHostRoleResponse>('getHostRoleById')));
  }

  getHostModules(isActive = true): Observable<GetHostModulesResponse> {
    const params = new HttpParams().set('isActive', isActive);

    return this.#http
      .get<GetHostModulesResponse>(`${this.#apiUrl}/get-host-modules`, { params })
      .pipe(catchError(this.handleError<GetHostModulesResponse>('getHostModules')));
  }

  createHostUser(body: CreateHostUserRequest): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#apiUrl}/create-host-user`, body)
      .pipe(catchError(this.handleError<HostResponse>('createHostUser')));
  }

  updateHostUser(body: UpdateHostUserRequest): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#apiUrl}/update-host-user`, body)
      .pipe(catchError(this.handleError<HostResponse>('updateHostUser')));
  }

  deleteHostUser(body: DeleteHostUserRequest): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#apiUrl}/delete-host-user`, body)
      .pipe(catchError(this.handleError<HostResponse>('deleteHostUser')));
  }

  resetHostUserPassword(body: ResetHostUserPasswordRequest): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#apiUrl}/reset-host-user-password`, body)
      .pipe(catchError(this.handleError<HostResponse>('resetHostUserPassword')));
  }

  changeHostUserPassword(body: ChangeHostUserPasswordRequest): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#apiUrl}/change-host-user-password`, body)
      .pipe(catchError(this.handleError<HostResponse>('changeHostUserPassword')));
  }

  createHostRole(body: CreateHostRoleRequest): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#apiUrl}/create-host-role`, body)
      .pipe(catchError(this.handleError<HostResponse>('createHostRole')));
  }

  updateHostRole(body: UpdateHostRoleRequest): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#apiUrl}/update-host-role`, body)
      .pipe(catchError(this.handleError<HostResponse>('updateHostRole')));
  }

  deleteHostRole(body: DeleteHostRoleRequest): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#apiUrl}/delete-host-role`, body)
      .pipe(catchError(this.handleError<HostResponse>('deleteHostRole')));
  }

  getHostRoleModulePermissions(
    hostRoleId: number,
    isActive = true,
  ): Observable<GetHostRoleModulePermissionsResponse> {
    const params = new HttpParams().set('isActive', isActive);

    return this.#http
      .get<GetHostRoleModulePermissionsResponse>(
        `${this.#rolePermissionApiUrl}/get-role-module-permissions/${hostRoleId}`,
        { params },
      )
      .pipe(
        catchError(
          this.handleError<GetHostRoleModulePermissionsResponse>('getHostRoleModulePermissions'),
        ),
      );
  }

  saveHostRoleModulePermissions(
    body: SaveHostRoleModulePermissionsRequest,
  ): Observable<HostResponse> {
    return this.#http
      .post<HostResponse>(`${this.#rolePermissionApiUrl}/save-role-module-permissions`, body)
      .pipe(catchError(this.handleError<HostResponse>('saveHostRoleModulePermissions')));
  }
}
