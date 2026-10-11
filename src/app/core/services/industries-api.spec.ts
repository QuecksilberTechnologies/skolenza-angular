import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IndustriesApi } from './industries-api';

describe('IndustriesApi Institution profile options', () => {
  let api: IndustriesApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IndustriesApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(IndustriesApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets Institution ownership categories without hard-coded query values', () => {
    api.getInstitutionCategoryOptions().subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/InstitutionType/category-options'),
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ isSucceeded: true, message: '', errors: [], data: [] });
  });

  it('gets education-specific campus types without hard-coded query values', () => {
    api.getInstitutionCampusTypeOptions().subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/InstitutionType/campus-type-options'),
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ isSucceeded: true, message: '', errors: [], data: [] });
  });
});
