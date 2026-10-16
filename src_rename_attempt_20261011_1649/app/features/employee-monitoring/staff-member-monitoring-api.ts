import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, Observable, of } from 'rxjs';

import { BaseService } from '@core/services/base-service';
import { environment } from '@env/environment';
import {
  AgentRegistration,
  AgentStatus,
  FieldVisit,
  MonitoringPolicy,
  MonitoringQuery,
  MonitoringResponse,
  RegisterAgentReq,
  ScreenCapture,
} from '@shared/interfaces';

import { mockCaptures, mockFieldVisits } from './data/staffMember-monitoring.mock';

const LATENCY_MS = 300;

/**
 * Institution-side `/Staff/Monitoring` endpoints. `moduleId` / `operationId` (`STAFF_DEVICE_ENROLMENTS`) are
 * added by `moduleOperationInterceptor`. The `runtime/*` routes authenticate with the desktop
 * agent's `X-Agent-Credential`, not a user session, so they are deliberately not wrapped here.
 *
 * Captures and field visits stay mock-backed until the backend ships read endpoints for them;
 * swap each for an `HttpClient` call when it lands - the signatures stay.
 */
@Injectable({ providedIn: 'root' })
export class StaffMemberMonitoringApi extends BaseService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/Staff/Monitoring`;

  upsertPolicy(body: MonitoringPolicy): Observable<MonitoringResponse<MonitoringPolicy>> {
    return this.#http
      .post<MonitoringResponse<MonitoringPolicy>>(`${this.#apiUrl}/policy`, body)
      .pipe(catchError(this.handleError<MonitoringResponse<MonitoringPolicy>>('upsertPolicy')));
  }

  registerAgent(body: RegisterAgentReq): Observable<MonitoringResponse<AgentRegistration>> {
    return this.#http
      .post<MonitoringResponse<AgentRegistration>>(`${this.#apiUrl}/agent/register`, body)
      .pipe(catchError(this.handleError<MonitoringResponse<AgentRegistration>>('registerAgent')));
  }

  /** Every agent in the Institution. 404 when the Institution has no monitoring policy yet. */
  getAgentStatuses(): Observable<MonitoringResponse<AgentStatus[]>> {
    return this.#http
      .get<MonitoringResponse<AgentStatus[]>>(`${this.#apiUrl}/agent/status`)
      .pipe(catchError(this.handleError<MonitoringResponse<AgentStatus[]>>('getAgentStatuses')));
  }

  getCaptures(query: MonitoringQuery): Observable<MonitoringResponse<ScreenCapture[]>> {
    return this.#respond(mockCaptures(query.staffMemberId, query.date), 'getCaptures');
  }

  getFieldVisits(query: MonitoringQuery): Observable<MonitoringResponse<FieldVisit[]>> {
    return this.#respond(mockFieldVisits(query.staffMemberId, query.date), 'getFieldVisits');
  }

  #respond<T>(data: T, operation: string): Observable<MonitoringResponse<T>> {
    return of({ isSucceeded: true, message: '', data }).pipe(
      delay(LATENCY_MS),
      catchError(this.handleError<MonitoringResponse<T>>(operation)),
    );
  }
}


