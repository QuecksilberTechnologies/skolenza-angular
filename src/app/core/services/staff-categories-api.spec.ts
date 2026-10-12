import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';

import { StaffCategoriesAPI } from './staff-categories-api';

describe('StaffCategoriesAPI', () => {
  let api: StaffCategoriesAPI;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StaffCategoriesAPI, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(StaffCategoriesAPI);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the central category catalogue without permission identifiers', () => {
    api.getOptions().subscribe((response) => {
      expect(response.data[0]).toEqual(
        expect.objectContaining({ id: 1, code: 'ADMINISTRATIVE', label: 'Administrative' }),
      );
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/Staff/Category/options`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('ModuleId')).toBe(false);
    expect(request.request.params.has('OperationId')).toBe(false);
    request.flush({
      isSucceeded: true,
      message: '',
      errors: [],
      data: [{ id: 1, code: 'ADMINISTRATIVE', label: 'Administrative', description: null }],
    });
  });
});
