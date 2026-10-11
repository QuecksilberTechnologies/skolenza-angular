import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach } from 'vitest';

import { environment } from '@env/environment';
import { GetMyMenuRes } from '@shared/interfaces';

import { ApiError } from './base-service';
import { FeaturePageApi } from './feature-page-api';

const URL = `${environment.apiUrl}/Navigation/my-menu`;

describe('FeaturePageApi', () => {
  let api: FeaturePageApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FeaturePageApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FeaturePageApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests the menu with no parameters', () => {
    let res: GetMyMenuRes | undefined;
    api.getFeaturePages().subscribe((r) => (res = r));

    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({
      isSucceeded: true,
      message: 'ok',
      data: { userType: 'InstitutionStaffMember', items: [] },
    } satisfies GetMyMenuRes);

    expect(res!.isSucceeded).toBe(true);
  });

  it('surfaces a server failure as an ApiError', () => {
    let error: unknown;
    api.getFeaturePages().subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(URL)
      .flush({ message: 'Menu unavailable' }, { status: 500, statusText: 'Server Error' });

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).toBe('Menu unavailable');
  });
});
