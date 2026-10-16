import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { HostPlanPriceReq, HostTaxRuleReq } from '@shared/interfaces';

import { HostBillingApi } from './host-billing-api';

const BASE = `${environment.apiUrl}/host/billing`;
const OK = { isSucceeded: true, message: '', data: null };

const planPrice: HostPlanPriceReq = {
  subscriptionPlanId: 1,
  countryCode: 'IN',
  currencyCode: 'INR',
  billingCycle: 'Monthly',
  baseAmount: 999,
  effectiveFrom: '2026-10-01',
  effectiveTo: null,
  isActive: true,
};

const taxRule: HostTaxRuleReq = {
  countryCode: 'IN',
  taxCode: 'GST',
  taxName: 'Goods and Services Tax',
  ratePercent: 18,
  effectiveFrom: '2026-10-01',
  effectiveTo: null,
  isActive: true,
  configurationJson: null,
};

describe('HostBillingApi', () => {
  let api: HostBillingApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HostBillingApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HostBillingApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads the unpaged endpoints with no params', () => {
    const calls: [() => unknown, string][] = [
      [() => api.getConfiguration().subscribe(), 'configuration'],
      [() => api.getPlanPrices().subscribe(), 'plan-prices'],
      [() => api.getTaxRules().subscribe(), 'tax-rules'],
      [() => api.getReconciliation().subscribe(), 'reconciliation'],
    ];

    for (const [call, endpoint] of calls) {
      call();
      const request = httpMock.expectOne(`${BASE}/${endpoint}`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);
      request.flush(OK);
    }
  });

  it('pages transactions, refunds and audit, dropping empty filters', () => {
    const calls: [() => unknown, string][] = [
      [
        () =>
          api
            .getTransactions({ PageNumber: 2, PageSize: 20, Search: '', Status: 'Success' })
            .subscribe(),
        'transactions',
      ],
      [
        () =>
          api
            .getRefunds({ PageNumber: 2, PageSize: 20, Search: '', Status: 'Success' })
            .subscribe(),
        'refunds',
      ],
      [
        () =>
          api.getAudit({ PageNumber: 2, PageSize: 20, Search: '', Status: 'Success' }).subscribe(),
        'audit',
      ],
    ];

    for (const [call, endpoint] of calls) {
      call();
      const request = httpMock.expectOne((req) => req.url === `${BASE}/${endpoint}`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('PageNumber')).toBe('2');
      expect(request.request.params.get('PageSize')).toBe('20');
      expect(request.request.params.get('Status')).toBe('Success');
      expect(request.request.params.has('Search')).toBe(false);
      request.flush(OK);
    }
  });

  it('creates with POST and updates with PUT on the id', () => {
    api.addPlanPrice(planPrice).subscribe();
    api.updatePlanPrice(7, planPrice).subscribe();
    api.addTaxRule(taxRule).subscribe();
    api.updateTaxRule(8, taxRule).subscribe();

    const expectations: [string, string, unknown][] = [
      ['POST', `${BASE}/plan-prices`, planPrice],
      ['PUT', `${BASE}/plan-prices/7`, planPrice],
      ['POST', `${BASE}/tax-rules`, taxRule],
      ['PUT', `${BASE}/tax-rules/8`, taxRule],
    ];

    for (const [method, url, body] of expectations) {
      const request = httpMock.expectOne({ method, url });
      expect(request.request.body).toEqual(body);
      request.flush(OK);
    }
  });

  it('deletes plan prices and tax rules by id', () => {
    api.deletePlanPrice(7).subscribe();
    api.deleteTaxRule(8).subscribe();

    httpMock.expectOne({ method: 'DELETE', url: `${BASE}/plan-prices/7` }).flush(OK);
    httpMock.expectOne({ method: 'DELETE', url: `${BASE}/tax-rules/8` }).flush(OK);
  });

  it('requests a refund with its idempotency key', () => {
    const body = {
      paymentTransactionId: 1,
      amount: 250,
      reason: 'Approved partial service refund',
      idempotencyKey: 'de305d54-75b4-431b-adb2-eb6b9e546014',
    };
    api.requestRefund(body).subscribe();

    const request = httpMock.expectOne({ method: 'POST', url: `${BASE}/refunds` });
    expect(request.request.body).toEqual(body);
    request.flush(OK);
  });

  it('retries a webhook with an empty body for the interceptor to fill', () => {
    api.retryWebhook(42).subscribe();

    const request = httpMock.expectOne({ method: 'POST', url: `${BASE}/webhooks/42/retry` });
    expect(request.request.body).toEqual({});
    request.flush(OK);
  });

  it('updates the configuration with PUT', () => {
    const body = {
      sellerLegalName: 'Example Private Limited',
      sellerBillingEmail: 'billing@example.com',
      sellerBillingPhone: null,
      countryCode: 'IN',
      stateCode: 'MP',
      postalCode: '482001',
      addressLine1: 'Example registered address',
      addressLine2: null,
      taxRegistrationNumber: '23ABCDE1234F1Z5',
      invoicePrefix: 'AXP',
      paymentRetryCount: 3,
      gracePeriodDays: 1,
      paymentTimeoutMinutes: 30,
      reconciliationLookbackDays: 7,
      isActive: true,
      version: 1,
    };
    api.updateConfiguration(body).subscribe();

    const request = httpMock.expectOne({ method: 'PUT', url: `${BASE}/configuration` });
    expect(request.request.body).toEqual(body);
    request.flush(OK);
  });
});
