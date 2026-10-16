import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { SKIP_ERROR_TOAST } from '@shared/utilities/skip-error-toast.token';

import { SuperAdminDashboardApi } from './super-admin-dashboard-api';

const BASE = `${environment.apiUrl}/Dashboard/SuperAdmin`;

describe('SuperAdminDashboardApi', () => {
  let api: SuperAdminDashboardApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SuperAdminDashboardApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SuperAdminDashboardApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads each widget from its own endpoint', () => {
    const calls: [() => unknown, string][] = [
      [() => api.getSummary().subscribe(), 'Summary'],
      [() => api.getStaffMemberOverview().subscribe(), 'StaffMemberOverview'],
      [() => api.getDepartmentHeadcount().subscribe(), 'DepartmentHeadcount'],
      [() => api.getCurrentlyOnLeave().subscribe(), 'CurrentlyOnLeave'],
      [() => api.getStorage().subscribe(), 'Storage'],
      [() => api.getHiringPipeline().subscribe(), 'HiringPipeline'],
    ];

    for (const [call, endpoint] of calls) {
      call();
      const request = httpMock.expectOne(`${BASE}/${endpoint}`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);
      request.flush({ isSucceeded: true, message: '', errors: [], data: null });
    }
  });

  it('passes the birthday window as `days`', () => {
    api.getBirthdays({ days: 30 }).subscribe();

    const request = httpMock.expectOne((req) => req.url === `${BASE}/Birthdays`);
    expect(request.request.params.get('days')).toBe('30');
    request.flush({ isSucceeded: true, message: '', errors: [], data: [] });
  });

  it('passes the row cap as `limit` for onboarding and locations', () => {
    api.getOnboarding({ limit: 10 }).subscribe();
    api.getLocations({ limit: 5 }).subscribe();

    const onboarding = httpMock.expectOne((req) => req.url === `${BASE}/Onboarding`);
    const locations = httpMock.expectOne((req) => req.url === `${BASE}/Locations`);
    expect(onboarding.request.params.get('limit')).toBe('10');
    expect(locations.request.params.get('limit')).toBe('5');
    onboarding.flush({ isSucceeded: true, message: '', errors: [], data: [] });
    locations.flush({ isSucceeded: true, message: '', errors: [], data: null });
  });

  it('opts every read out of the global 403 toast', () => {
    api.getSummary().subscribe();
    api.getLocations({ limit: 5 }).subscribe();

    for (const endpoint of ['Summary', 'Locations']) {
      const request = httpMock.expectOne((req) => req.url === `${BASE}/${endpoint}`);
      expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
      request.flush({ isSucceeded: true, message: '', errors: [], data: null });
    }
  });

  it('rethrows an HTTP failure carrying the status', () => {
    let error: { status?: number } | undefined;
    api.getSummary().subscribe({ error: (err) => (error = err) });

    httpMock
      .expectOne(`${BASE}/Summary`)
      .flush(
        { isSucceeded: false, message: 'Forbidden', errors: [], data: null },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(error?.status).toBe(403);
  });
});
