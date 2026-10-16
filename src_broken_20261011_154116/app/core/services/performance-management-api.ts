import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, Observable, of } from 'rxjs';

import {
  DashboardResponse,
  Feedback,
  FeedbackResponse,
  Goal,
  GoalsResponse,
  HistoryResponse,
  OneOnOne,
  OneOnOneResponse,
  PmsResponse,
  Review,
  ReviewsResponse,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * Performance Management API.
 *
 * MOCK-ONLY: reads static JSON from `data/*.json` (mirrors HolidaysApi).
 * Mutations echo the payload via `of()` with no persistence.
 * TODO: API — swap each method for real HTTP against the PMS backend.
 */
@Injectable({
  providedIn: 'root',
})
export class PerformanceManagementApi extends BaseService {
  // readonly #apiUrl = `${environment.apiUrl}/PerformanceManagement`;
  readonly #http = inject(HttpClient);

  /** Simulated network latency for mock writes (ms). */
  readonly #mockLatency = 300;

  getDashboard(): Observable<DashboardResponse> {
    return this.#http
      .get<DashboardResponse>('data/pms-dashboard.json')
      .pipe(catchError(this.handleError<DashboardResponse>('getDashboard')));
  }

  getGoals(): Observable<GoalsResponse> {
    // TODO: API — getGoals(req) with makeHttpParams(req)
    return this.#http
      .get<GoalsResponse>('data/pms-goals.json')
      .pipe(catchError(this.handleError<GoalsResponse>('getGoals')));
  }

  getReviews(): Observable<ReviewsResponse> {
    return this.#http
      .get<ReviewsResponse>('data/pms-reviews.json')
      .pipe(catchError(this.handleError<ReviewsResponse>('getReviews')));
  }

  getFeedback(): Observable<FeedbackResponse> {
    return this.#http
      .get<FeedbackResponse>('data/pms-feedback.json')
      .pipe(catchError(this.handleError<FeedbackResponse>('getFeedback')));
  }

  getMeetings(): Observable<OneOnOneResponse> {
    return this.#http
      .get<OneOnOneResponse>('data/pms-one-on-one.json')
      .pipe(catchError(this.handleError<OneOnOneResponse>('getMeetings')));
  }

  getHistory(): Observable<HistoryResponse> {
    return this.#http
      .get<HistoryResponse>('data/pms-history.json')
      .pipe(catchError(this.handleError<HistoryResponse>('getHistory')));
  }

  // ---- Mock writes (no backend). Echo payload so stores can patch state. ----

  saveGoal(goal: Goal): Observable<PmsResponse<Goal>> {
    // TODO: API — POST/PUT /goals
    return of(this.#ok(goal, 'Goal saved')).pipe(delay(this.#mockLatency));
  }

  saveReview(review: Review): Observable<PmsResponse<Review>> {
    // TODO: API — POST/PUT /reviews
    return of(this.#ok(review, 'Review saved')).pipe(delay(this.#mockLatency));
  }

  saveFeedback(feedback: Feedback): Observable<PmsResponse<Feedback>> {
    // TODO: API — POST /feedback
    return of(this.#ok(feedback, 'Feedback shared')).pipe(delay(this.#mockLatency));
  }

  saveMeeting(meeting: OneOnOne): Observable<PmsResponse<OneOnOne>> {
    // TODO: API — POST/PUT /one-on-one
    return of(this.#ok(meeting, 'Meeting saved')).pipe(delay(this.#mockLatency));
  }

  deleteById(id: string): Observable<PmsResponse<string>> {
    // TODO: API — DELETE /{resource}/{id}
    return of(this.#ok(id, 'Deleted')).pipe(delay(this.#mockLatency));
  }

  #ok<T>(data: T, message: string): PmsResponse<T> {
    return {
      isSucceeded: true,
      message,
      errors: [],
      data,
      pageNumber: 1,
      pageSize: 1,
      totalRecords: 1,
      totalPages: 1,
    };
  }
}
