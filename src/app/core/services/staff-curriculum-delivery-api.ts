import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AcademicWorkflowStatusOption,
  ApiDataResponse,
  CurriculumFramework,
  CurriculumUnit,
  LessonDelivery,
  LessonPlan,
  SaveCurriculumFramework,
  SaveCurriculumTopic,
  SaveCurriculumUnit,
  SaveLessonDelivery,
  SaveLessonPlan,
  StaffTeachingAssignment,
  SyllabusProgress,
  WorkflowReview,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({ providedIn: 'root' })
export class StaffCurriculumDeliveryApi extends BaseService {
  readonly #url = `${environment.apiUrl}/Staff/curriculum-delivery`;
  readonly #http = inject(HttpClient);
  getStatuses(): Observable<ApiDataResponse<AcademicWorkflowStatusOption[]>> {
    return this.#get<AcademicWorkflowStatusOption[]>('workflow-statuses');
  }
  getFrameworks(): Observable<ApiDataResponse<CurriculumFramework[]>> {
    return this.#get<CurriculumFramework[]>('frameworks');
  }
  saveFramework(value: SaveCurriculumFramework): Observable<ApiDataResponse<CurriculumFramework>> {
    return this.#save<CurriculumFramework>('frameworks', value.id, value);
  }
  reviewFramework(
    id: number,
    value: WorkflowReview,
  ): Observable<ApiDataResponse<CurriculumFramework>> {
    return this.#http
      .put<ApiDataResponse<CurriculumFramework>>(`${this.#url}/frameworks/${id}/review`, value)
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<CurriculumFramework>>('reviewCurriculumFramework'),
        ),
      );
  }
  getUnits(frameworkId: number): Observable<ApiDataResponse<CurriculumUnit[]>> {
    return this.#get<CurriculumUnit[]>(`frameworks/${frameworkId}/units`);
  }
  saveUnit(value: SaveCurriculumUnit): Observable<ApiDataResponse<CurriculumUnit>> {
    return this.#save<CurriculumUnit>('units', value.id, value);
  }
  saveTopic(value: SaveCurriculumTopic): Observable<ApiDataResponse<unknown>> {
    return this.#save<unknown>('topics', value.id, value);
  }
  getTeachingAssignments(): Observable<ApiDataResponse<StaffTeachingAssignment[]>> {
    return this.#get<StaffTeachingAssignment[]>('teaching-assignments');
  }
  getLessonPlans(): Observable<ApiDataResponse<LessonPlan[]>> {
    return this.#get<LessonPlan[]>('lesson-plans');
  }
  saveLessonPlan(value: SaveLessonPlan): Observable<ApiDataResponse<LessonPlan>> {
    return this.#save<LessonPlan>('lesson-plans', value.id, value);
  }
  reviewLessonPlan(id: number, value: WorkflowReview): Observable<ApiDataResponse<LessonPlan>> {
    return this.#http
      .put<ApiDataResponse<LessonPlan>>(`${this.#url}/lesson-plans/${id}/review`, value)
      .pipe(catchError(this.handleError<ApiDataResponse<LessonPlan>>('reviewLessonPlan')));
  }
  getDeliveries(): Observable<ApiDataResponse<LessonDelivery[]>> {
    return this.#get<LessonDelivery[]>('lesson-deliveries');
  }
  saveDelivery(value: SaveLessonDelivery): Observable<ApiDataResponse<LessonDelivery>> {
    return this.#save<LessonDelivery>('lesson-deliveries', value.id, value);
  }
  reviewDelivery(id: number, value: WorkflowReview): Observable<ApiDataResponse<LessonDelivery>> {
    return this.#http
      .put<ApiDataResponse<LessonDelivery>>(`${this.#url}/lesson-deliveries/${id}/review`, value)
      .pipe(catchError(this.handleError<ApiDataResponse<LessonDelivery>>('reviewLessonDelivery')));
  }
  getProgress(courseOfferingId?: number): Observable<ApiDataResponse<SyllabusProgress[]>> {
    const params = courseOfferingId
      ? new HttpParams().set('courseOfferingId', courseOfferingId)
      : undefined;
    return this.#http
      .get<ApiDataResponse<SyllabusProgress[]>>(`${this.#url}/syllabus-progress`, { params })
      .pipe(
        catchError(this.handleError<ApiDataResponse<SyllabusProgress[]>>('getSyllabusProgress')),
      );
  }
  #get<T>(path: string): Observable<ApiDataResponse<T>> {
    return this.#http
      .get<ApiDataResponse<T>>(`${this.#url}/${path}`)
      .pipe(catchError(this.handleError<ApiDataResponse<T>>(`get${path}`)));
  }
  #save<T>(path: string, id: number | undefined, value: object): Observable<ApiDataResponse<T>> {
    const request = id
      ? this.#http.put<ApiDataResponse<T>>(`${this.#url}/${path}/${id}`, value)
      : this.#http.post<ApiDataResponse<T>>(`${this.#url}/${path}`, value);
    return request.pipe(catchError(this.handleError<ApiDataResponse<T>>(`save${path}`)));
  }
}
