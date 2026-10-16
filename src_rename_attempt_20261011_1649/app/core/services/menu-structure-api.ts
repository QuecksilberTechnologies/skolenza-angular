import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { GetMenuStructuresReq, GetMenuStructuresRes } from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class MenuStructureApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/MenuStructure`;
  readonly #http = inject(HttpClient);

  /** Display targets (left menu, top bar) a mapping can render on. Zeroed ids mean "no filter". */
  getMenuStructures(
    body: GetMenuStructuresReq = { moduleId: 0, operationId: 0, pageNumber: 1, pageSize: 100 },
  ): Observable<GetMenuStructuresRes> {
    return this.#http
      .post<GetMenuStructuresRes>(`${this.#apiUrl}/get-menus-structure`, body)
      .pipe(catchError(this.handleError<GetMenuStructuresRes>('getMenuStructures')));
  }
}
