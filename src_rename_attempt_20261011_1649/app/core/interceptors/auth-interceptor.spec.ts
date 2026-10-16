import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthApi, TokenRefreshService } from '@core/services';
import { environment } from '@env/environment';
import { SKIP_AUTH } from '@shared/utilities/skip-auth.token';

import { authInterceptor } from './auth-interceptor';

const RESOURCE_URL = `${environment.apiUrl}/Department/get`;
const REFRESH_URL = `${environment.apiUrl}/Auth/refresh-token`;

function makeToken(secondsFromNow: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + secondsFromNow };
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${body}.signature`;
}

function refreshResponse(token: string) {
  return { isSucceeded: true, message: 'OK', errors: [], data: { token, refreshToken: 'rt-new' } };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authApi: AuthApi;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authApi = TestBed.inject(AuthApi);
    TestBed.inject(TokenRefreshService).reset();
  });

  it('attaches the access token and does not refresh while it is valid', () => {
    authApi.setTokens(makeToken(3600), 'rt-1');

    http.get(RESOURCE_URL).subscribe();

    const req = httpMock.expectOne(RESOURCE_URL);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${authApi.getToken()}`);
    req.flush({});

    httpMock.expectNone(REFRESH_URL);
    httpMock.verify();
  });

  it('leaves SKIP_AUTH requests untouched', () => {
    authApi.setTokens(makeToken(-60), 'rt-1');

    http.get(RESOURCE_URL, { context: new HttpContext().set(SKIP_AUTH, true) }).subscribe();

    const req = httpMock.expectOne(RESOURCE_URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});

    httpMock.expectNone(REFRESH_URL);
    httpMock.verify();
  });

  it('refreshes before sending when the token is already expired', () => {
    authApi.setTokens(makeToken(-60), 'rt-1');
    const fresh = makeToken(3600);

    http.get(RESOURCE_URL).subscribe();

    // No business request goes out until the refresh resolves.
    httpMock.expectNone(RESOURCE_URL);
    httpMock.expectOne(REFRESH_URL).flush(refreshResponse(fresh));

    const req = httpMock.expectOne(RESOURCE_URL);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fresh}`);
    req.flush({});

    expect(authApi.getToken()).toBe(fresh);
    expect(authApi.getRefreshToken()).toBe('rt-new');
    httpMock.verify();
  });

  it('issues a single refresh for concurrent requests on an expired token', () => {
    authApi.setTokens(makeToken(-60), 'rt-1');
    const fresh = makeToken(3600);
    const done: number[] = [];

    for (const i of [1, 2, 3, 4]) {
      http.get(`${RESOURCE_URL}?page=${i}`).subscribe(() => done.push(i));
    }

    httpMock.expectOne(REFRESH_URL).flush(refreshResponse(fresh));

    for (const i of [1, 2, 3, 4]) {
      httpMock.expectOne(`${RESOURCE_URL}?page=${i}`).flush({});
    }

    expect(done).toEqual([1, 2, 3, 4]);
    httpMock.verify();
  });

  // A refused refresh token is dead: every later request would refresh, fail and leave the user
  // stranded in the shell. The parked requests still error so the caller can surface it.
  it('errors every parked request and logs out once when the refresh is refused', () => {
    authApi.setTokens(makeToken(-60), 'rt-1');
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);
    const errors: unknown[] = [];

    for (const i of [1, 2, 3]) {
      http.get(`${RESOURCE_URL}?page=${i}`).subscribe({ error: (err) => errors.push(err) });
    }

    httpMock
      .expectOne(REFRESH_URL)
      .flush({ message: 'invalid refresh token' }, { status: 401, statusText: 'Unauthorized' });

    expect(errors).toHaveLength(3);
    expect(logout).toHaveBeenCalledTimes(1);
    httpMock.verify();
  });

  // A network blip or a server fault says nothing about the refresh token, and dropping the user to
  // login over it loses their work.
  it.each([
    [0, 'Unknown Error'],
    [500, 'Internal Server Error'],
    [503, 'Service Unavailable'],
  ])('keeps the session when the refresh fails with %i', (status, statusText) => {
    authApi.setTokens(makeToken(-60), 'rt-1');
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);
    const errors: unknown[] = [];

    http.get(RESOURCE_URL).subscribe({ error: (err) => errors.push(err) });

    httpMock.expectOne(REFRESH_URL).flush(null, { status, statusText });

    expect(errors).toHaveLength(1);
    expect(authApi.getRefreshToken()).toBe('rt-1');
    expect(logout).not.toHaveBeenCalled();
    httpMock.verify();
  });

  // The API can refuse a refresh inside a 200 envelope. Saving that envelope's empty tokens would
  // overwrite the stored pair; the refusal is as final as a 401, so the session ends.
  it('logs out without saving the tokens when the refresh answers 200 with isSucceeded false', () => {
    const stale = makeToken(-60);
    authApi.setTokens(stale, 'rt-1');
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);
    const errors: unknown[] = [];

    http.get(RESOURCE_URL).subscribe({ error: (err) => errors.push(err) });

    httpMock.expectOne(REFRESH_URL).flush({
      isSucceeded: false,
      message: 'Refresh token expired',
      errors: [],
      data: { token: null, refreshToken: null },
    });

    httpMock.expectNone(RESOURCE_URL);
    expect(errors).toHaveLength(1);
    expect(authApi.getToken()).toBe(stale);
    expect(authApi.getRefreshToken()).toBe('rt-1');
    expect(logout).toHaveBeenCalledTimes(1);
    httpMock.verify();
  });

  it('refreshes and retries once when a valid-looking token is rejected', () => {
    authApi.setTokens(makeToken(3600), 'rt-1');
    const fresh = makeToken(3600);

    http.get(RESOURCE_URL).subscribe();

    httpMock.expectOne(RESOURCE_URL).flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(REFRESH_URL).flush(refreshResponse(fresh));

    const retry = httpMock.expectOne(RESOURCE_URL);
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${fresh}`);
    retry.flush({});

    httpMock.verify();
  });

  it('logs out instead of looping when the retry is also rejected', () => {
    authApi.setTokens(makeToken(3600), 'rt-1');
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);

    http.get(RESOURCE_URL).subscribe({ error: () => undefined });

    httpMock.expectOne(RESOURCE_URL).flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(REFRESH_URL).flush(refreshResponse(makeToken(3600)));
    httpMock.expectOne(RESOURCE_URL).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(logout).toHaveBeenCalledTimes(1);
    httpMock.expectNone(REFRESH_URL);
    httpMock.verify();
  });

  it('does not refresh or log out when the request was never authenticated', () => {
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);
    const errors: unknown[] = [];

    http.get(RESOURCE_URL).subscribe({ error: (err) => errors.push(err) });

    const req = httpMock.expectOne(RESOURCE_URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errors).toHaveLength(1);
    expect(logout).not.toHaveBeenCalled();
    httpMock.expectNone(REFRESH_URL);
    httpMock.verify();
  });

  it('logs out when a valid-looking token is rejected and there is nothing to refresh with', () => {
    localStorage.setItem('skolenza/token', makeToken(3600));
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);
    const errors: unknown[] = [];

    http.get(RESOURCE_URL).subscribe({ error: (err) => errors.push(err) });

    httpMock.expectOne(RESOURCE_URL).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errors).toHaveLength(1);
    expect(logout).toHaveBeenCalledTimes(1);
    httpMock.expectNone(REFRESH_URL);
    httpMock.verify();
  });

  it('logs out without any HTTP call when no refresh token is stored', () => {
    localStorage.setItem('skolenza/token', makeToken(-60));
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);
    const errors: unknown[] = [];

    http.get(RESOURCE_URL).subscribe({ error: (err) => errors.push(err) });

    expect(errors).toHaveLength(1);
    expect(logout).toHaveBeenCalled();
    httpMock.verify();
  });
});
