import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AttendancePolicyApi } from '@core/services';
import { AttendanceLocationScope, AttendancePolicyRow } from '@shared/interfaces';

import { AttendancePoliciesStore } from './attendance-policies.store';

function createPolicy(overrides: Partial<AttendancePolicyRow> = {}): AttendancePolicyRow {
  return {
    id: 1,
    policyTypeId: 4,
    policyName: 'Hybrid Attendance',
    description: null,
    remark: null,
    attendanceLocationScope: AttendanceLocationScope.AssignedLocations,
    allowBiometric: true,
    allowMobile: true,
    allowWeb: false,
    allowManualAttendance: false,
    allowWorkFromHome: true,
    requireGeoFenceForOffice: true,
    requireGpsForRemote: true,
    allowOutsideLocationWithApproval: false,
    isActive: true,
    ...overrides,
  };
}

describe('AttendancePoliciesStore', () => {
  const attendancePolicyApiMock = {
    getAttendancePolicies: vi.fn(),
    setAttendancePolicyStatus: vi.fn(),
    deleteAttendancePolicy: vi.fn(),
  };

  const createStore = (attendancePolicies: AttendancePolicyRow[]) => {
    const store = TestBed.inject(AttendancePoliciesStore);
    patchState(store as never, { attendancePolicies });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    attendancePolicyApiMock.getAttendancePolicies.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    attendancePolicyApiMock.setAttendancePolicyStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Status updated.', errors: [], data: null }),
    );
    attendancePolicyApiMock.deleteAttendancePolicy.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        AttendancePoliciesStore,
        { provide: AttendancePolicyApi, useValue: attendancePolicyApiMock },
      ],
    });
  });

  it('re-queries with the selected policy type and status', async () => {
    const store = TestBed.inject(AttendancePoliciesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.setPolicyTypeId(4);
    store.setIsActive(false);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(attendancePolicyApiMock.getAttendancePolicies).toHaveBeenLastCalledWith({
      Search: '',
      PolicyTypeId: 4,
      IsActive: false,
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('keeps the rows and total from a successful page', async () => {
    attendancePolicyApiMock.getAttendancePolicies.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [createPolicy({ id: 7 })],
        totalRecords: 42,
      }),
    );

    const store = TestBed.inject(AttendancePoliciesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.attendancePolicies().map((row) => row.id)).toEqual([7]);
    expect(store.totalRecords()).toBe(42);
  });

  it('sends the requested page back to the API', async () => {
    const store = TestBed.inject(AttendancePoliciesStore);
    await TestBed.inject(ApplicationRef).whenStable();

    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(attendancePolicyApiMock.getAttendancePolicies).toHaveBeenLastCalledWith(
      expect.objectContaining({ PageNumber: 3, PageSize: 10 }),
    );
  });

  it('returns to the first page when a filter changes', async () => {
    const store = TestBed.inject(AttendancePoliciesStore);
    store.loadPage({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    store.setPolicyTypeId(2);

    expect(store.pageNumber()).toBe(1);
  });

  it('clears the grid and reports when the list call fails', async () => {
    const store = createStore([createPolicy({ id: 7 })]);
    attendancePolicyApiMock.getAttendancePolicies.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    store.setIsActive(true);
    await TestBed.inject(ApplicationRef).whenStable();

    // `handleError` rethrows, so a silent failure would leave the stale row on screen.
    expect(store.attendancePolicies()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
    expect(store.isLoading()).toBe(false);
  });

  describe('toggleActive', () => {
    it('sends the flipped status for the row', () => {
      const store = createStore([createPolicy({ id: 7, isActive: true })]);

      store.toggleActive(store.attendancePolicies()[0]);

      expect(attendancePolicyApiMock.setAttendancePolicyStatus).toHaveBeenCalledWith({
        id: 7,
        isActive: false,
      });
    });

    it('clears the row spinner when the call fails', () => {
      attendancePolicyApiMock.setAttendancePolicyStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = createStore([createPolicy({ id: 7, isActive: true })]);

      store.toggleActive(store.attendancePolicies()[0]);

      expect(store.attendancePolicies()).toEqual([
        expect.objectContaining({ id: 7, isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deleteAttendancePolicy', () => {
    it('sends the row id', () => {
      const store = createStore([createPolicy({ id: 7 })]);

      store.deleteAttendancePolicy(store.attendancePolicies()[0]);

      expect(attendancePolicyApiMock.deleteAttendancePolicy).toHaveBeenCalledWith(7);
    });

    /** A dependency reject arrives as `isSucceeded: false`, and the row has to stop spinning. */
    it('clears the row spinner when the backend rejects the delete', () => {
      attendancePolicyApiMock.deleteAttendancePolicy.mockReturnValue(
        of({
          isSucceeded: false,
          message: 'Policy is used by an active work arrangement.',
          errors: [],
          data: null,
        }),
      );
      const store = createStore([createPolicy({ id: 7 })]);

      store.deleteAttendancePolicy(store.attendancePolicies()[0]);

      expect(store.attendancePolicies()).toEqual([
        expect.objectContaining({ id: 7, isDeleting: false }),
      ]);
    });
  });
});
