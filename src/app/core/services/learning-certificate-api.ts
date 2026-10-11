import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { CertificatesResponse } from '@shared/interfaces';

import { BaseService } from './base-service';

/** Learning certificates API. MOCK-ONLY: reads `data/learning/certificates.json`. */
@Injectable({ providedIn: 'root' })
export class LearningCertificateApi extends BaseService {
  readonly #http = inject(HttpClient);

  getCertificates(): Observable<CertificatesResponse> {
    return this.#http
      .get<CertificatesResponse>('data/learning/certificates.json')
      .pipe(catchError(this.handleError<CertificatesResponse>('getCertificates')));
  }
}
