import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { InstitutionPolicyApi } from './institution-policy-api';

describe('InstitutionPolicyApi resolvePolicies', () => {
  let api: InstitutionPolicyApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InstitutionPolicyApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(InstitutionPolicyApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends the encoded staffMember id unchanged', () => {
    const encodedStaffMemberId = '78N5XZW2';

    api
      .resolvePolicies({
        staffMemberId: encodedStaffMemberId,
        effectiveDate: '2026-09-26',
        moduleId: 67,
        operationId: 4,
      })
      .subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/InstitutionPolicy/resolve'));

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('staffMemberId')).toBe(encodedStaffMemberId);
    expect(request.request.params.get('effectiveDate')).toBe('2026-09-26');
    expect(request.request.params.get('moduleId')).toBe('67');
    expect(request.request.params.get('operationId')).toBe('4');

    request.flush({
      isSucceeded: true,
      message: 'Effective policies resolved successfully.',
      errors: [],
      data: [],
    });
  });
});
