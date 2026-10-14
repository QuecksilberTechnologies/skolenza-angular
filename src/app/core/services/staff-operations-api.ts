import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  ApiDataResponse,
  CommunicationSetting,
  CreateStaffConversation,
  SaveSubstituteWorkflow,
  SaveStaffQueryCategory,
  SaveTimetableEntry,
  SaveTimetablePeriod,
  SaveTimetableWorkflow,
  StaffConversation,
  StaffConversationDetail,
  StaffMessageAttachment,
  StaffAbsenceImpact,
  StaffOperationsOptions,
  StaffQueryCategory,
  SubstituteWorkflow,
  TimetableEntry,
  TimetablePeriod,
  TimetableWorkflow,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({ providedIn: 'root' })
export class StaffOperationsApi extends BaseService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiUrl}/Staff/operations`;
  getOptions() {
    return this.#get<StaffOperationsOptions>('options');
  }
  getPeriods() {
    return this.#get<TimetablePeriod[]>('timetable/periods');
  }
  savePeriod(value: SaveTimetablePeriod) {
    return this.#save<TimetablePeriod>('timetable/periods', value.id, value);
  }
  getEntries() {
    return this.#get<TimetableEntry[]>('timetable/entries');
  }
  saveEntry(value: SaveTimetableEntry) {
    return this.#save<TimetableEntry>('timetable/entries', value.id, value);
  }
  getTimetableWorkflows() {
    return this.#get<TimetableWorkflow[]>('timetable/workflows');
  }
  saveTimetableWorkflow(value: SaveTimetableWorkflow) {
    return this.#save<TimetableWorkflow>('timetable/workflows', value.id, value);
  }
  submitTimetableEntry(id: number) {
    return this.#http.post<ApiDataResponse<TimetableEntry>>(
      `${this.#url}/timetable/entries/${id}/submit`,
      {},
    );
  }
  actOnTimetableEntry(id: number, actionCode: 'APPROVE' | 'REJECT' | 'PUBLISH', remark?: string) {
    return this.#http.post<ApiDataResponse<TimetableEntry>>(
      `${this.#url}/timetable/entries/${id}/actions`,
      { actionCode, remark },
    );
  }
  createTimetableRevision(id: number) {
    return this.#http.post<ApiDataResponse<TimetableEntry>>(
      `${this.#url}/timetable/entries/${id}/revisions`,
      {},
    );
  }
  getWorkflows() {
    return this.#get<SubstituteWorkflow[]>('substitute-workflows');
  }
  getAbsenceImpacts() {
    return this.#get<StaffAbsenceImpact[]>('absence-impacts');
  }
  synchronizeLeaveImpacts(leaveRequestId: number) {
    return this.#http
      .post<ApiDataResponse<StaffAbsenceImpact[]>>(
        `${this.#url}/absence-impacts/leave/${leaveRequestId}/synchronize`,
        {},
      )
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<StaffAbsenceImpact[]>>('synchronizeLeaveImpacts'),
        ),
      );
  }
  assignSubstitute(value: object) {
    return this.#http
      .post<ApiDataResponse<StaffAbsenceImpact>>(`${this.#url}/substitute-assignments`, value)
      .pipe(catchError(this.handleError<ApiDataResponse<StaffAbsenceImpact>>('assignSubstitute')));
  }
  actOnSubstitute(id: number, actionCode: string, remark?: string) {
    return this.#http
      .post<ApiDataResponse<StaffAbsenceImpact>>(
        `${this.#url}/substitute-assignments/${id}/actions`,
        { actionCode, remark },
      )
      .pipe(catchError(this.handleError<ApiDataResponse<StaffAbsenceImpact>>('actOnSubstitute')));
  }
  saveWorkflow(value: SaveSubstituteWorkflow) {
    return this.#save<SubstituteWorkflow>('substitute-workflows', value.id, value);
  }
  getCommunicationSetting() {
    return this.#get<CommunicationSetting>('communication/settings');
  }
  saveCommunicationSetting(
    value: CommunicationSetting,
  ): Observable<ApiDataResponse<CommunicationSetting>> {
    return this.#http
      .put<ApiDataResponse<CommunicationSetting>>(`${this.#url}/communication/settings`, value)
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<CommunicationSetting>>('saveCommunicationSetting'),
        ),
      );
  }
  getQueryCategories(activeOnly = false) {
    return this.#http
      .get<ApiDataResponse<StaffQueryCategory[]>>(
        `${this.#url}/communication/query-categories?activeOnly=${activeOnly}`,
      )
      .pipe(
        catchError(this.handleError<ApiDataResponse<StaffQueryCategory[]>>('getQueryCategories')),
      );
  }
  saveQueryCategory(value: SaveStaffQueryCategory) {
    return this.#save<StaffQueryCategory>('communication/query-categories', value.id, value);
  }
  deactivateQueryCategory(id: number) {
    return this.#http
      .delete<ApiDataResponse<boolean>>(`${this.#url}/communication/query-categories/${id}`)
      .pipe(catchError(this.handleError<ApiDataResponse<boolean>>('deactivateQueryCategory')));
  }
  getConversations() {
    return this.#get<StaffConversation[]>('communication/conversations');
  }
  getConversation(id: number) {
    return this.#get<StaffConversationDetail>(`communication/conversations/${id}`);
  }
  markConversationRead(id: number) {
    return this.#http
      .post<ApiDataResponse<StaffConversationDetail>>(
        `${this.#url}/communication/conversations/${id}/read`,
        {},
      )
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<StaffConversationDetail>>('markConversationRead'),
        ),
      );
  }
  closeConversation(id: number) {
    return this.#http
      .post<ApiDataResponse<StaffConversationDetail>>(
        `${this.#url}/communication/conversations/${id}/close`,
        {},
      )
      .pipe(
        catchError(this.handleError<ApiDataResponse<StaffConversationDetail>>('closeConversation')),
      );
  }
  createConversation(
    value: CreateStaffConversation,
  ): Observable<ApiDataResponse<StaffConversation>> {
    return this.#http
      .post<ApiDataResponse<StaffConversation>>(`${this.#url}/communication/conversations`, value)
      .pipe(catchError(this.handleError<ApiDataResponse<StaffConversation>>('createConversation')));
  }
  addMessage(id: number, body: string): Observable<ApiDataResponse<StaffConversation>> {
    return this.#http
      .post<ApiDataResponse<StaffConversation>>(
        `${this.#url}/communication/conversations/${id}/messages`,
        { body },
      )
      .pipe(catchError(this.handleError<ApiDataResponse<StaffConversation>>('addMessage')));
  }
  uploadMessageAttachment(messageId: number, file: File) {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.#http
      .post<ApiDataResponse<StaffMessageAttachment>>(
        `${this.#url}/communication/messages/${messageId}/attachments`,
        form,
      )
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<StaffMessageAttachment>>('uploadMessageAttachment'),
        ),
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
