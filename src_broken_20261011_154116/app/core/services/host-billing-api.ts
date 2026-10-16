import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  HostBillingAuditEntry,
  HostBillingConfiguration,
  HostBillingConfigurationReq,
  HostBillingListReq,
  HostBillingPage,
  HostBillingRes,
  HostPaymentTransaction,
  HostPlanPrice,
  HostPlanPriceReq,
  HostReconciliationSummary,
  HostRefund,
  HostRefundReq,
  HostTaxRule,
  HostTaxRuleReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `/api/host/billing` — HostAdmin pricing, tax, payment, refund, reconciliation, audit and
 * configuration.
 *
 * `ModuleId` / `OperationId` come from the `/host/billing/*` rows in `module-operation-routes.ts`:
 * on the query for reads and deletes, nested under `permissionRequest` for the writes.
 */
@Injectable({
  providedIn: 'root',
})
export class HostBillingApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/host/billing`;
  readonly #http = inject(HttpClient);

  getConfiguration(): Observable<HostBillingRes<HostBillingConfiguration>> {
    return this.#http
      .get<HostBillingRes<HostBillingConfiguration>>(`${this.#apiUrl}/configuration`)
      .pipe(
        catchError(this.handleError<HostBillingRes<HostBillingConfiguration>>('getConfiguration')),
      );
  }

  /** A stale `version` answers 409 — reload before retrying. */
  updateConfiguration(
    body: HostBillingConfigurationReq,
  ): Observable<HostBillingRes<HostBillingConfiguration>> {
    return this.#http
      .put<HostBillingRes<HostBillingConfiguration>>(`${this.#apiUrl}/configuration`, body)
      .pipe(
        catchError(
          this.handleError<HostBillingRes<HostBillingConfiguration>>('updateConfiguration'),
        ),
      );
  }

  /** Unpaged — the whole list comes back in one call. */
  getPlanPrices(): Observable<HostBillingRes<HostPlanPrice[]>> {
    return this.#http
      .get<HostBillingRes<HostPlanPrice[]>>(`${this.#apiUrl}/plan-prices`)
      .pipe(catchError(this.handleError<HostBillingRes<HostPlanPrice[]>>('getPlanPrices')));
  }

  addPlanPrice(body: HostPlanPriceReq): Observable<HostBillingRes<HostPlanPrice>> {
    return this.#http
      .post<HostBillingRes<HostPlanPrice>>(`${this.#apiUrl}/plan-prices`, body)
      .pipe(catchError(this.handleError<HostBillingRes<HostPlanPrice>>('addPlanPrice')));
  }

  updatePlanPrice(id: number, body: HostPlanPriceReq): Observable<HostBillingRes<HostPlanPrice>> {
    return this.#http
      .put<HostBillingRes<HostPlanPrice>>(`${this.#apiUrl}/plan-prices/${id}`, body)
      .pipe(catchError(this.handleError<HostBillingRes<HostPlanPrice>>('updatePlanPrice')));
  }

  /** Deactivates rather than removes the row. */
  deletePlanPrice(id: number): Observable<HostBillingRes<boolean>> {
    return this.#http
      .delete<HostBillingRes<boolean>>(`${this.#apiUrl}/plan-prices/${id}`)
      .pipe(catchError(this.handleError<HostBillingRes<boolean>>('deletePlanPrice')));
  }

  /** Unpaged — the whole list comes back in one call. */
  getTaxRules(): Observable<HostBillingRes<HostTaxRule[]>> {
    return this.#http
      .get<HostBillingRes<HostTaxRule[]>>(`${this.#apiUrl}/tax-rules`)
      .pipe(catchError(this.handleError<HostBillingRes<HostTaxRule[]>>('getTaxRules')));
  }

  addTaxRule(body: HostTaxRuleReq): Observable<HostBillingRes<HostTaxRule>> {
    return this.#http
      .post<HostBillingRes<HostTaxRule>>(`${this.#apiUrl}/tax-rules`, body)
      .pipe(catchError(this.handleError<HostBillingRes<HostTaxRule>>('addTaxRule')));
  }

  updateTaxRule(id: number, body: HostTaxRuleReq): Observable<HostBillingRes<HostTaxRule>> {
    return this.#http
      .put<HostBillingRes<HostTaxRule>>(`${this.#apiUrl}/tax-rules/${id}`, body)
      .pipe(catchError(this.handleError<HostBillingRes<HostTaxRule>>('updateTaxRule')));
  }

  /** Deactivates rather than removes the row. */
  deleteTaxRule(id: number): Observable<HostBillingRes<boolean>> {
    return this.#http
      .delete<HostBillingRes<boolean>>(`${this.#apiUrl}/tax-rules/${id}`)
      .pipe(catchError(this.handleError<HostBillingRes<boolean>>('deleteTaxRule')));
  }

  getTransactions(
    req: HostBillingListReq,
  ): Observable<HostBillingRes<HostBillingPage<HostPaymentTransaction>>> {
    return this.#http
      .get<HostBillingRes<HostBillingPage<HostPaymentTransaction>>>(
        `${this.#apiUrl}/transactions`,
        {
          params: this.makeHttpParams(req),
        },
      )
      .pipe(
        catchError(
          this.handleError<HostBillingRes<HostBillingPage<HostPaymentTransaction>>>(
            'getTransactions',
          ),
        ),
      );
  }

  getRefunds(req: HostBillingListReq): Observable<HostBillingRes<HostBillingPage<HostRefund>>> {
    return this.#http
      .get<HostBillingRes<HostBillingPage<HostRefund>>>(`${this.#apiUrl}/refunds`, {
        params: this.makeHttpParams(req),
      })
      .pipe(
        catchError(this.handleError<HostBillingRes<HostBillingPage<HostRefund>>>('getRefunds')),
      );
  }

  /** Queues the refund as `Requested`; the provider worker settles it later. */
  requestRefund(body: HostRefundReq): Observable<HostBillingRes<HostRefund>> {
    return this.#http
      .post<HostBillingRes<HostRefund>>(`${this.#apiUrl}/refunds`, body)
      .pipe(catchError(this.handleError<HostBillingRes<HostRefund>>('requestRefund')));
  }

  getReconciliation(): Observable<HostBillingRes<HostReconciliationSummary>> {
    return this.#http
      .get<HostBillingRes<HostReconciliationSummary>>(`${this.#apiUrl}/reconciliation`)
      .pipe(
        catchError(
          this.handleError<HostBillingRes<HostReconciliationSummary>>('getReconciliation'),
        ),
      );
  }

  /** Requeues a failed webhook event within the configured retry limit. */
  retryWebhook(id: number): Observable<HostBillingRes<boolean>> {
    return this.#http
      .post<HostBillingRes<boolean>>(`${this.#apiUrl}/webhooks/${id}/retry`, {})
      .pipe(catchError(this.handleError<HostBillingRes<boolean>>('retryWebhook')));
  }

  getAudit(
    req: HostBillingListReq,
  ): Observable<HostBillingRes<HostBillingPage<HostBillingAuditEntry>>> {
    return this.#http
      .get<HostBillingRes<HostBillingPage<HostBillingAuditEntry>>>(`${this.#apiUrl}/audit`, {
        params: this.makeHttpParams(req),
      })
      .pipe(
        catchError(
          this.handleError<HostBillingRes<HostBillingPage<HostBillingAuditEntry>>>('getAudit'),
        ),
      );
  }
}
