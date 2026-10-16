import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Common } from '@core/services';
import { environment } from '@env/environment';
import { SKIP_ERROR_TOAST } from '@shared/utilities/skip-error-toast.token';

import { errorInterceptor } from './error-interceptor';

const RESOURCE_URL = `${environment.apiUrl}/Department/get`;

const FORBIDDEN_MESSAGE = 'You do not have permission to perform this action.';

describe('errorInterceptor', () => {
  const commonMock = { showMessage: vi.fn() };

  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: commonMock },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Resolves with the error the caller sees, so each test can assert it was not swallowed. */
  function requestRejectingWith(status: number): Promise<HttpErrorResponse> {
    return new Promise((resolve) => {
      http.get(RESOURCE_URL).subscribe({ error: resolve });
      httpMock.expectOne(RESOURCE_URL).flush({ message: 'nope' }, { status, statusText: 'x' });
    });
  }

  it('should toast once on a 403 and still surface the error to the caller', async () => {
    const error = await requestRejectingWith(403);

    expect(commonMock.showMessage).toHaveBeenCalledTimes(1);
    expect(commonMock.showMessage).toHaveBeenCalledWith(FORBIDDEN_MESSAGE, 'error');
    expect(error.status).toBe(403);
  });

  it.each([400, 401, 500])('should not toast on a %i', async (status) => {
    const error = await requestRejectingWith(status);

    expect(commonMock.showMessage).not.toHaveBeenCalled();
    expect(error.status).toBe(status);
  });

  it('should stay silent on a 403 the caller opted out of, and still surface it', async () => {
    const error = await new Promise<HttpErrorResponse>((resolve) => {
      http
        .get(RESOURCE_URL, { context: new HttpContext().set(SKIP_ERROR_TOAST, true) })
        .subscribe({ error: resolve });
      httpMock.expectOne(RESOURCE_URL).flush({}, { status: 403, statusText: 'Forbidden' });
    });

    expect(commonMock.showMessage).not.toHaveBeenCalled();
    expect(error.status).toBe(403);
  });

  it('should leave a successful response untouched', async () => {
    const body = await new Promise((resolve) => {
      http.get(RESOURCE_URL).subscribe(resolve);
      httpMock.expectOne(RESOURCE_URL).flush({ ok: true });
    });

    expect(body).toEqual({ ok: true });
    expect(commonMock.showMessage).not.toHaveBeenCalled();
  });
});
