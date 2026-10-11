import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, map, Observable, of } from 'rxjs';

import {
  AssessmentResponse,
  AssessmentsResponse,
  AssignedResponse,
  CalendarResponse,
  Course,
  CourseResponse,
  CoursesResponse,
  KnowledgeResponse,
  LearningPathsResponse,
  LearningResponse,
  MyLearningResponse,
  QuizResult,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * Learning catalog & enrollment API.
 *
 * MOCK-ONLY: reads static JSON from `data/learning/*.json` (mirrors PerformanceManagementApi).
 * Mutations echo the payload via `of()` with no persistence.
 * TODO: API — swap each method for real HTTP against the Learning backend.
 */
@Injectable({ providedIn: 'root' })
export class LearningApi extends BaseService {
  readonly #http = inject(HttpClient);
  readonly #mockLatency = 300;

  getCourses(): Observable<CoursesResponse> {
    return this.#http
      .get<CoursesResponse>('data/learning/courses.json')
      .pipe(catchError(this.handleError<CoursesResponse>('getCourses')));
  }

  getCourseById(id: string): Observable<CourseResponse> {
    return this.getCourses().pipe(
      map((res) => {
        const course = res.data.find((c) => c.id === id) ?? null;
        return this.#ok(course as Course, course ? 'Course loaded' : 'Course not found');
      }),
      catchError(this.handleError<CourseResponse>('getCourseById')),
    );
  }

  getMyLearning(): Observable<MyLearningResponse> {
    return this.#http
      .get<MyLearningResponse>('data/learning/my-learning.json')
      .pipe(catchError(this.handleError<MyLearningResponse>('getMyLearning')));
  }

  enroll(course: Course): Observable<CourseResponse> {
    // TODO: API — POST /enroll
    return of(this.#ok(course, 'Enrolled successfully')).pipe(delay(this.#mockLatency));
  }

  getLearningPaths(): Observable<LearningPathsResponse> {
    return this.#http
      .get<LearningPathsResponse>('data/learning/learning-paths.json')
      .pipe(catchError(this.handleError<LearningPathsResponse>('getLearningPaths')));
  }

  getAssigned(): Observable<AssignedResponse> {
    return this.#http
      .get<AssignedResponse>('data/learning/assigned.json')
      .pipe(catchError(this.handleError<AssignedResponse>('getAssigned')));
  }

  getAssessments(): Observable<AssessmentsResponse> {
    return this.#http
      .get<AssessmentsResponse>('data/learning/assessments.json')
      .pipe(catchError(this.handleError<AssessmentsResponse>('getAssessments')));
  }

  getAssessmentById(id: string): Observable<AssessmentResponse> {
    return this.getAssessments().pipe(
      map((res) => {
        const found = res.data.find((a) => a.id === id);
        return this.#ok(found!, found ? 'Assessment loaded' : 'Assessment not found');
      }),
      catchError(this.handleError<AssessmentResponse>('getAssessmentById')),
    );
  }

  submitQuiz(result: QuizResult): Observable<LearningResponse<QuizResult>> {
    // TODO: API — POST /quiz/submit
    return of(this.#ok(result, 'Quiz submitted')).pipe(delay(this.#mockLatency));
  }

  getKnowledge(): Observable<KnowledgeResponse> {
    return this.#http
      .get<KnowledgeResponse>('data/learning/knowledge.json')
      .pipe(catchError(this.handleError<KnowledgeResponse>('getKnowledge')));
  }

  getCalendar(): Observable<CalendarResponse> {
    return this.#http
      .get<CalendarResponse>('data/learning/calendar.json')
      .pipe(catchError(this.handleError<CalendarResponse>('getCalendar')));
  }

  saveCourse(course: Course): Observable<CourseResponse> {
    // TODO: API — POST/PUT /admin/courses
    return of(this.#ok(course, 'Course saved')).pipe(delay(this.#mockLatency));
  }

  deleteCourse(id: string): Observable<LearningResponse<string>> {
    // TODO: API — DELETE /admin/courses/{id}
    return of(this.#ok(id, 'Course deleted')).pipe(delay(this.#mockLatency));
  }

  #ok<T>(data: T, message: string): LearningResponse<T> {
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
