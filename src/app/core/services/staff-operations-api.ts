import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  ApiDataResponse,
  CommunicationSetting,
  CreateStaffConversation,
  SaveSubstituteWorkflow,
  SaveTimetableEntry,
  SaveTimetablePeriod,
  StaffConversation,
  SubstituteWorkflow,
  TimetableEntry,
  TimetablePeriod,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({ providedIn: 'root' })
export class StaffOperationsApi extends BaseService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiUrl}/Staff/operations`;
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
  getWorkflows() {
    return this.#get<SubstituteWorkflow[]>('substitute-workflows');
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
  getConversations() {
    return this.#get<StaffConversation[]>('communication/conversations');
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
