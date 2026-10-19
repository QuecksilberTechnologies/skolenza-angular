import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AcademicWorkflowStatusOption,
  ApiDataResponse,
  CurriculumFramework,
  CurriculumTopic,
  CurriculumUnit,
  LessonDelivery,
  LessonPlan,
  PagedDataResponse,
  PageRequest,
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
  getFrameworks(page: PageRequest): Observable<PagedDataResponse<CurriculumFramework>> {
    return this.#getPage<CurriculumFramework>('frameworks', page);
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
  getUnits(frameworkId: number, page: PageRequest): Observable<PagedDataResponse<CurriculumUnit>> {
    return this.#getPage<CurriculumUnit>(`frameworks/${frameworkId}/units`, page);
  }
  getTopics(unitId: number, page: PageRequest): Observable<PagedDataResponse<CurriculumTopic>> {
    return this.#getPage<CurriculumTopic>(`units/${unitId}/topics`, page);
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
  getLessonPlans(page: PageRequest): Observable<PagedDataResponse<LessonPlan>> {
    return this.#getPage<LessonPlan>('lesson-plans', page);
  }
  saveLessonPlan(value: SaveLessonPlan): Observable<ApiDataResponse<LessonPlan>> {
    return this.#save<LessonPlan>('lesson-plans', value.id, value);
  }
  reviewLessonPlan(id: number, value: WorkflowReview): Observable<ApiDataResponse<LessonPlan>> {
    return this.#http
      .put<ApiDataResponse<LessonPlan>>(`${this.#url}/lesson-plans/${id}/review`, value)
      .pipe(catchError(this.handleError<ApiDataResponse<LessonPlan>>('reviewLessonPlan')));
  }
  getDeliveries(page: PageRequest): Observable<PagedDataResponse<LessonDelivery>> {
    return this.#getPage<LessonDelivery>('lesson-deliveries', page);
  }
  saveDelivery(value: SaveLessonDelivery): Observable<ApiDataResponse<LessonDelivery>> {
    return this.#save<LessonDelivery>('lesson-deliveries', value.id, value);
  }
  reviewDelivery(id: number, value: WorkflowReview): Observable<ApiDataResponse<LessonDelivery>> {
    return this.#http
      .put<ApiDataResponse<LessonDelivery>>(`${this.#url}/lesson-deliveries/${id}/review`, value)
      .pipe(catchError(this.handleError<ApiDataResponse<LessonDelivery>>('reviewLessonDelivery')));
  }
  deleteRecord(
    path: 'frameworks' | 'units' | 'topics' | 'lesson-plans' | 'lesson-deliveries',
    id: number,
  ): Observable<ApiDataResponse<boolean>> {
    return this.#http
      .delete<ApiDataResponse<boolean>>(`${this.#url}/${path}/${id}`)
      .pipe(catchError(this.handleError<ApiDataResponse<boolean>>(`delete${path}`)));
  }
  getProgress(
    page: PageRequest,
    courseOfferingId?: number,
  ): Observable<PagedDataResponse<SyllabusProgress>> {
    return this.#getPage<SyllabusProgress>('syllabus-progress', page, { courseOfferingId });
  }
  #get<T>(path: string): Observable<ApiDataResponse<T>> {
    return this.#http
      .get<ApiDataResponse<T>>(`${this.#url}/${path}`)
      .pipe(catchError(this.handleError<ApiDataResponse<T>>(`get${path}`)));
  }
  #getPage<T>(
    path: string,
    page: PageRequest,
    filters: object = {},
  ): Observable<PagedDataResponse<T>> {
    return this.#http
      .get<PagedDataResponse<T>>(`${this.#url}/${path}`, {
        params: this.makePageParams(page, filters),
      })
      .pipe(catchError(this.handleError<PagedDataResponse<T>>(`get${path}`)));
  }
  #save<T>(path: string, id: number | undefined, value: object): Observable<ApiDataResponse<T>> {
    const request = id
      ? this.#http.put<ApiDataResponse<T>>(`${this.#url}/${path}/${id}`, value)
      : this.#http.post<ApiDataResponse<T>>(`${this.#url}/${path}`, value);
    return request.pipe(catchError(this.handleError<ApiDataResponse<T>>(`save${path}`)));
  }
}
