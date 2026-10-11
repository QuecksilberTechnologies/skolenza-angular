import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';

import { StaffMemberContactsAPI } from './staff-member-contacts-api';

describe('StaffMemberContactsAPI', () => {
  let api: StaffMemberContactsAPI;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StaffMemberContactsAPI, provideHttpClient(), provideHttpClientTesting()],
    });

    api = TestBed.inject(StaffMemberContactsAPI);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads enum-backed relation options without permission query parameters', () => {
    api.getRelationOptions().subscribe((response) => {
      expect(response.data.at(-2)).toEqual({ id: 16, code: 'OWNER', label: 'Owner' });
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/Staff/Contact/relation-options`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({
      isSucceeded: true,
      message: 'Contact relation options retrieved successfully.',
      errors: [],
      data: [
        { id: 16, code: 'OWNER', label: 'Owner' },
        { id: 99, code: 'OTHER', label: 'Other' },
      ],
    });
  });
});

