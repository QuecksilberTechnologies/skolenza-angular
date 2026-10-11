import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, Observable, of } from 'rxjs';

import {
  GetLeaveBalancesRes,
  GetLeaveStatusRes,
  GetMyLeavesRes,
  GetRequestedLeavesRes,
  LeaveMutationRes,
  SubmitLeaveRequestPayload,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class LeaveApi extends BaseService {
  readonly #http = inject(HttpClient);

  constructor() {
    super();
  }

  getMyLeaves(): Observable<GetMyLeavesRes> {
    return this.#http
      .get<GetMyLeavesRes>('data/leaves/my-leaves.json')
      .pipe(catchError(this.handleError<GetMyLeavesRes>('getMyLeaves')));
  }

  getRequestedLeaves(): Observable<GetRequestedLeavesRes> {
    return this.#http
      .get<GetRequestedLeavesRes>('data/leaves/requested-leaves.json')
      .pipe(catchError(this.handleError<GetRequestedLeavesRes>('getRequestedLeaves')));
  }

  getLeaveBalances(): Observable<GetLeaveBalancesRes> {
    return this.#http
      .get<GetLeaveBalancesRes>('data/leaves/leave-balances.json')
      .pipe(catchError(this.handleError<GetLeaveBalancesRes>('getLeaveBalances')));
  }

  getLeaveStatus(): Observable<GetLeaveStatusRes> {
    return this.#http
      .get<GetLeaveStatusRes>('data/leaves/leave-status.json')
      .pipe(catchError(this.handleError<GetLeaveStatusRes>('getLeaveStatus')));
  }

  // BACKEND PENDING — swap URL when /Leave/approve ships
  approveLeave(id: number): Observable<LeaveMutationRes> {
    return of<LeaveMutationRes>({
      isSucceeded: true,
      message: 'Leave request approved',
      errors: [],
      data: { id },
    }).pipe(delay(300));
  }

  // BACKEND PENDING — swap URL when /Leave/reject ships
  rejectLeave(id: number, reason?: string): Observable<LeaveMutationRes> {
    return of<LeaveMutationRes>({
      isSucceeded: true,
      message: 'Leave request rejected',
      errors: [],
      data: { id, reason },
    }).pipe(delay(300));
  }

  // BACKEND PENDING — swap URL when /Leave/submit ships
  submitLeaveRequest(payload: SubmitLeaveRequestPayload): Observable<LeaveMutationRes> {
    return of<LeaveMutationRes>({
      isSucceeded: true,
      message: 'Leave request submitted',
      errors: [],
      data: payload,
    }).pipe(delay(300));
  }

  // BACKEND PENDING — swap URL when /Leave/delete-status ships
  deleteLeaveStatus(id: number): Observable<LeaveMutationRes> {
    return of<LeaveMutationRes>({
      isSucceeded: true,
      message: 'Leave status deleted',
      errors: [],
      data: { id },
    }).pipe(delay(300));
  }
}
