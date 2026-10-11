import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { LearningDashboardResponse } from '@shared/interfaces';

import { BaseService } from './base-service';

/** Learning dashboard API. MOCK-ONLY: reads `data/learning/dashboard.json`. */
@Injectable({ providedIn: 'root' })
export class LearningDashboardApi extends BaseService {
  readonly #http = inject(HttpClient);

  getDashboard(): Observable<LearningDashboardResponse> {
    return this.#http
      .get<LearningDashboardResponse>('data/learning/dashboard.json')
      .pipe(catchError(this.handleError<LearningDashboardResponse>('getLearningDashboard')));
  }
}
