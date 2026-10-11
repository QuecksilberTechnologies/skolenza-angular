import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { BaseService } from '@core/services/base-service';
import {
  GetPayrollRecordsResponse,
  GetPayslipsResponse,
  GetSalaryStructuresResponse,
} from '@shared/interfaces';

@Injectable({
  providedIn: 'root',
})
export class PayrollApi extends BaseService {
  readonly #http = inject(HttpClient);

  getSalaryStructures(): Observable<GetSalaryStructuresResponse> {
    return this.#http
      .get<GetSalaryStructuresResponse>('data/payroll/salary-structures.json')
      .pipe(catchError(this.handleError<GetSalaryStructuresResponse>('getSalaryStructures')));
  }

  getPayrollRecords(): Observable<GetPayrollRecordsResponse> {
    return this.#http
      .get<GetPayrollRecordsResponse>('data/payroll/payroll-records.json')
      .pipe(catchError(this.handleError<GetPayrollRecordsResponse>('getPayrollRecords')));
  }

  getPayslips(): Observable<GetPayslipsResponse> {
    return this.#http
      .get<GetPayslipsResponse>('data/payroll/payslips.json')
      .pipe(catchError(this.handleError<GetPayslipsResponse>('getPayslips')));
  }
}
