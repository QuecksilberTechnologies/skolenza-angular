import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@env/environment';

import { unavailableRouteInterceptor } from './unavailable-route-interceptor';
import { isUnavailableRoute, UNAVAILABLE_ROUTE_MESSAGE } from './unavailable-routes';

describe('unavailableRouteInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unavailableRouteInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('fails a route on an undeployed controller without sending it', async () => {
    const error = await new Promise<HttpErrorResponse>((resolve) => {
      http.get(`${environment.apiUrl}/PolicyType/get-all`).subscribe({ error: resolve });
    });

    // A 404 rather than a 501, so `GlobalErrorHandler` keeps filing it as noise, not an incident.
    expect(error.status).toBe(404);
    expect(error.error).toEqual({ message: UNAVAILABLE_ROUTE_MESSAGE });
    httpMock.expectNone(() => true);
  });

  it('fails a single undeployed route on an otherwise live controller', async () => {
    const error = await new Promise<HttpErrorResponse>((resolve) => {
      http.post(`${environment.apiUrl}/Asset/assign-staff-member`, {}).subscribe({ error: resolve });
    });

    expect(error.status).toBe(404);
    httpMock.expectNone(() => true);
  });

  it('sends a request the API does serve', () => {
    http.get(`${environment.apiUrl}/Asset/get`).subscribe();

    httpMock.expectOne(`${environment.apiUrl}/Asset/get`).flush({});
  });
});

describe('isUnavailableRoute', () => {
  it('matches every route under an undeployed controller, whatever the method', () => {
    expect(isUnavailableRoute('GET', `${environment.apiUrl}/AttendancePolicy/get-all`)).toBe(true);
    expect(isUnavailableRoute('DELETE', `${environment.apiUrl}/AttendancePolicy/delete/7`)).toBe(
      true,
    );
    expect(isUnavailableRoute('POST', `${environment.apiUrl}/LeaveRule/create`)).toBe(true);
    expect(isUnavailableRoute('POST', `${environment.apiUrl}/Leave/add-leave-type`)).toBe(true);
  });

  it('gates insurance routes that are absent from the current API', () => {
    expect(
      isUnavailableRoute('GET', `${environment.apiUrl}/Staff/Insurance/get-all-enroll`),
    ).toBe(true);
    expect(isUnavailableRoute('GET', `${environment.apiUrl}/Insurance/get-all`)).toBe(true);
  });

  it('gates the ticket-header list only on its unfiltered route', () => {
    expect(isUnavailableRoute('GET', `${environment.apiUrl}/Ticket/TicketHeader/get-all`)).toBe(
      true,
    );
    expect(
      isUnavailableRoute(
        'GET',
        `${environment.apiUrl}/Ticket/TicketHeader/get-by-classification-id`,
      ),
    ).toBe(false);
  });

  it('keys a single route on its method and ignores a query string', () => {
    expect(
      isUnavailableRoute('GET', `${environment.apiUrl}/Role/get-permissions?StaffMemberId=1`),
    ).toBe(true);
    expect(isUnavailableRoute('POST', `${environment.apiUrl}/Role/get-permissions`)).toBe(false);
  });

  it('ignores a URL that is not ours', () => {
    expect(isUnavailableRoute('GET', 'https://example.com/api/PolicyType/get-all')).toBe(false);
  });
});

