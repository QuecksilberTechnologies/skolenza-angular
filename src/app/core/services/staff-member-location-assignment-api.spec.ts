import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { StaffMemberLocationAssignmentApi } from './staff-member-location-assignment-api';

describe('StaffMemberLocationAssignmentApi', () => {
  let api: StaffMemberLocationAssignmentApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StaffMemberLocationAssignmentApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(StaffMemberLocationAssignmentApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const assignment = {
    staffMemberId: '78N5XZW2',
    campusId: 7,
    isPrimary: true,
    isAttendanceAllowed: true,
    effectiveFrom: '2026-09-26',
    effectiveTo: null,
    isActive: true,
  };

  it('sends the encoded staffMember id unchanged on create', () => {
    api.addStaffMemberLocationAssignment(assignment).subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/StaffCampusAssignment/create'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body.staffMemberId).toBe('78N5XZW2');
    request.flush({ isSucceeded: true, message: 'Created.', data: null });
  });

  it('sends the encoded staffMember id unchanged on update', () => {
    api.updateStaffMemberLocationAssignment({ ...assignment, id: 15 }).subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/StaffCampusAssignment/update'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ...assignment, id: 15 });
    request.flush({ isSucceeded: true, message: 'Updated.', data: null });
  });

  it('uses the status endpoint for deactivation', () => {
    api.setStaffMemberLocationAssignmentStatus({ id: 15, isActive: false }).subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/StaffCampusAssignment/update-status'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ id: 15, isActive: false });
    request.flush({ isSucceeded: true, message: 'Deactivated.', data: null });
  });

  it('uses the assignment id in the delete route', () => {
    api.deleteStaffMemberLocationAssignment(15).subscribe();

    const request = httpMock.expectOne((req) =>
      req.url.endsWith('/StaffCampusAssignment/delete/15'),
    );
    expect(request.request.method).toBe('DELETE');
    request.flush({ isSucceeded: true, message: 'Deleted.', data: true });
  });
});

