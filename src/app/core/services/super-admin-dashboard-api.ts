import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  SuperAdminBirthdaysReq,
  SuperAdminDashboardStaffMember,
  SuperAdminDashboardRes,
  SuperAdminDepartmentHeadcount,
  SuperAdminStaffMemberOverview,
  SuperAdminHiringPipeline,
  SuperAdminLeave,
  SuperAdminLimitReq,
  SuperAdminLocationOverview,
  SuperAdminStorage,
  SuperAdminSummary,
} from '@shared/interfaces';
import { SKIP_ERROR_TOAST } from '@shared/utilities/skip-error-toast.token';

import { BaseService } from './base-service';

/**
 * `/api/Dashboard/SuperAdmin` — the Admin dashboard, one endpoint per widget so each card loads
 * on its own.
 *
 * `ModuleId` / `OperationId` come from the `dashboard` controller fallback in
 * `module-operation-routes.ts`. Every non-Admin role type gets a 403, which each widget absorbs
 * into its own empty state — so the global 403 toast is skipped, or a Manager would get nine.
 */
@Injectable({
  providedIn: 'root',
})
export class SuperAdminDashboardApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Dashboard/SuperAdmin`;
  readonly #http = inject(HttpClient);
  readonly #context = new HttpContext().set(SKIP_ERROR_TOAST, true);

  getSummary(): Observable<SuperAdminDashboardRes<SuperAdminSummary>> {
    return this.#get<SuperAdminSummary>('Summary', 'getSummary');
  }

  getStaffMemberOverview(): Observable<SuperAdminDashboardRes<SuperAdminStaffMemberOverview>> {
    return this.#get<SuperAdminStaffMemberOverview>('StaffMemberOverview', 'getStaffMemberOverview');
  }

  getBirthdays(
    req: SuperAdminBirthdaysReq = {},
  ): Observable<SuperAdminDashboardRes<SuperAdminDashboardStaffMember[]>> {
    return this.#get<SuperAdminDashboardStaffMember[]>('Birthdays', 'getBirthdays', req);
  }

  getOnboarding(
    req: SuperAdminLimitReq = {},
  ): Observable<SuperAdminDashboardRes<SuperAdminDashboardStaffMember[]>> {
    return this.#get<SuperAdminDashboardStaffMember[]>('Onboarding', 'getOnboarding', req);
  }

  getDepartmentHeadcount(): Observable<SuperAdminDashboardRes<SuperAdminDepartmentHeadcount[]>> {
    return this.#get<SuperAdminDepartmentHeadcount[]>(
      'DepartmentHeadcount',
      'getDepartmentHeadcount',
    );
  }

  getCurrentlyOnLeave(): Observable<SuperAdminDashboardRes<SuperAdminLeave[]>> {
    return this.#get<SuperAdminLeave[]>('CurrentlyOnLeave', 'getCurrentlyOnLeave');
  }

  getLocations(
    req: SuperAdminLimitReq = {},
  ): Observable<SuperAdminDashboardRes<SuperAdminLocationOverview>> {
    return this.#get<SuperAdminLocationOverview>('Locations', 'getLocations', req);
  }

  getStorage(): Observable<SuperAdminDashboardRes<SuperAdminStorage>> {
    return this.#get<SuperAdminStorage>('Storage', 'getStorage');
  }

  getHiringPipeline(): Observable<SuperAdminDashboardRes<SuperAdminHiringPipeline>> {
    return this.#get<SuperAdminHiringPipeline>('HiringPipeline', 'getHiringPipeline');
  }

  #get<T>(
    endpoint: string,
    operation: string,
    req?: object,
  ): Observable<SuperAdminDashboardRes<T>> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<SuperAdminDashboardRes<T>>(`${this.#apiUrl}/${endpoint}`, {
        params,
        context: this.#context,
      })
      .pipe(catchError(this.handleError<SuperAdminDashboardRes<T>>(operation)));
  }
}
