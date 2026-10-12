import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { RoleDashboardCode } from '@shared/interfaces';

import { RoleDashboardApi } from './role-dashboard-api';

describe('RoleDashboardApi', () => {
  let api: RoleDashboardApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RoleDashboardApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(RoleDashboardApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it.each<RoleDashboardCode>(['INSTITUTION_ADMIN', 'STAFF_MANAGER', 'STAFF_MEMBER', 'EXTERNAL_USER'])(
    'reads the %s dashboard from its own path',
    (code) => {
      api.getDashboard(code).subscribe();

      const request = httpMock.expectOne(`${environment.apiUrl}/Dashboard/${code}`);
      expect(request.request.method).toBe('GET');
      request.flush({ isSucceeded: true, message: '', errors: [], data: null });
    },
  );

  it('rethrows an HTTP failure carrying the status', () => {
    let error: { status?: number } | undefined;
    api.getDashboard('INSTITUTION_ADMIN').subscribe({ error: (err) => (error = err) });

    httpMock
      .expectOne(`${environment.apiUrl}/Dashboard/INSTITUTION_ADMIN`)
      .flush(
        { isSucceeded: false, message: 'Forbidden', errors: [], data: null },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(error?.status).toBe(403);
  });
});
