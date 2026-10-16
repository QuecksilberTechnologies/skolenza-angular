import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateInstitutionCardMasterReq,
  GetInstitutionCardMasterRes,
  GetInstitutionCardMastersReq,
  GetInstitutionCardMastersRes,
  InstitutionCardMasterMutationRes,
  UpdateInstitutionCardMasterReq,
  UpdateInstitutionCardMasterStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class InstitutionCardMasterApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/InstitutionCardMaster`;
  readonly #http = inject(HttpClient);

  getInstitutionCardMasters(req: GetInstitutionCardMastersReq): Observable<GetInstitutionCardMastersRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionCardMastersRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetInstitutionCardMastersRes>('getInstitutionCardMasters')));
  }

  /** `InstitutionId` scopes the read the same way it scopes `setInstitutionCardMasterStatus` and
   *  `deleteInstitutionCardMaster` — see `InstitutionDeviceApi.getInstitutionDevice` for the identical rule on
   *  the sibling controller. */
  getInstitutionCardMaster(id: string, institutionId: string | null): Observable<GetInstitutionCardMasterRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .get<GetInstitutionCardMasterRes>(`${this.#apiUrl}/get-by-id/${id}`, { params })
      .pipe(catchError(this.handleError<GetInstitutionCardMasterRes>('getInstitutionCardMaster')));
  }

  addInstitutionCardMaster(body: CreateInstitutionCardMasterReq): Observable<InstitutionCardMasterMutationRes> {
    return this.#http
      .post<InstitutionCardMasterMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<InstitutionCardMasterMutationRes>('addInstitutionCardMaster')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateInstitutionCardMaster(body: UpdateInstitutionCardMasterReq): Observable<InstitutionCardMasterMutationRes> {
    return this.#http
      .post<InstitutionCardMasterMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<InstitutionCardMasterMutationRes>('updateInstitutionCardMaster')));
  }

  setInstitutionCardMasterStatus(
    body: UpdateInstitutionCardMasterStatusReq,
  ): Observable<InstitutionCardMasterMutationRes> {
    return this.#http
      .post<InstitutionCardMasterMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(catchError(this.handleError<InstitutionCardMasterMutationRes>('setInstitutionCardMasterStatus')));
  }

  deleteInstitutionCardMaster(
    id: string,
    institutionId: string | null,
  ): Observable<InstitutionCardMasterMutationRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .delete<InstitutionCardMasterMutationRes>(`${this.#apiUrl}/delete/${id}`, { params })
      .pipe(catchError(this.handleError<InstitutionCardMasterMutationRes>('deleteInstitutionCardMaster')));
  }
}
