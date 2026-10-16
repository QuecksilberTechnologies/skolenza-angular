import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { StaffMemberLocationAssignmentApi } from '@core/services';
import { StaffMemberLocationAssignmentRow } from '@shared/interfaces';

import { StaffMemberLocationAssignmentsStore } from './staffMember-location-assignment-info.store';

function createAssignment(overrides: Partial<StaffMemberLocationAssignmentRow> = {}) {
  return {
    id: 1,
    staffMemberId: 'XGQRD0Z8',
    institutionLocationId: 3,
    isPrimary: true,
    isAttendanceAllowed: true,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    isActive: true,
    ...overrides,
  } satisfies StaffMemberLocationAssignmentRow;
}

const ok = <T>(data: T[], totalRecords = data.length) =>
  of({ isSucceeded: true, message: '', errors: [], data, totalRecords });

const mutated = (message: string) => of({ isSucceeded: true, message, errors: [], data: null });

describe('StaffMemberLocationAssignmentsStore', () => {
  const apiMock = {
    getStaffMemberLocationAssignments: vi.fn(),
    setStaffMemberLocationAssignmentStatus: vi.fn(),
    deleteStaffMemberLocationAssignment: vi.fn(),
  };

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getStaffMemberLocationAssignments.mockReturnValue(ok([createAssignment()], 24));
    apiMock.setStaffMemberLocationAssignmentStatus.mockReturnValue(mutated('Updated.'));
    apiMock.deleteStaffMemberLocationAssignment.mockReturnValue(mutated('Deleted.'));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        StaffMemberLocationAssignmentsStore,
        { provide: StaffMemberLocationAssignmentApi, useValue: apiMock },
      ],
    });
  });

  it('lists every assignment when no staffMember is chosen', async () => {
    const store = TestBed.inject(StaffMemberLocationAssignmentsStore);
    await settle();

    expect(apiMock.getStaffMemberLocationAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ StaffMemberId: null, PageNumber: 1, PageSize: 10 }),
    );
    expect(store.assignments()).toHaveLength(1);
    expect(store.totalRecords()).toBe(24);
  });

  it('sends the staffMember, location and status filters and returns to page one', async () => {
    const store = TestBed.inject(StaffMemberLocationAssignmentsStore);
    store.loadPage({ first: 10, rows: 10 });
    await settle();

    store.setStaffMemberId('XGQRD0Z8');
    store.setInstitutionLocationId(3);
    store.setIsActive(false);
    await settle();

    expect(apiMock.getStaffMemberLocationAssignments).toHaveBeenLastCalledWith(
      expect.objectContaining({
        StaffMemberId: 'XGQRD0Z8',
        InstitutionLocationId: 3,
        IsActive: false,
        PageNumber: 1,
      }),
    );
  });

  it('clears the rows when the call fails', async () => {
    apiMock.getStaffMemberLocationAssignments.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(StaffMemberLocationAssignmentsStore);
    await settle();

    expect(store.assignments()).toEqual([]);
    expect(store.totalRecords()).toBe(0);
    expect(store.isLoading()).toBe(false);
  });

  describe('toggleActive', () => {
    it('sends the row id with the flipped status and refetches', async () => {
      const store = TestBed.inject(StaffMemberLocationAssignmentsStore);
      await settle();
      apiMock.getStaffMemberLocationAssignments.mockClear();

      store.toggleActive(store.assignments()[0]);
      await settle();

      expect(apiMock.setStaffMemberLocationAssignmentStatus).toHaveBeenCalledWith({
        id: 1,
        isActive: false,
      });
      expect(apiMock.getStaffMemberLocationAssignments).toHaveBeenCalledTimes(1);
    });

    it('clears the row spinner when the call fails', async () => {
      apiMock.setStaffMemberLocationAssignmentStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = TestBed.inject(StaffMemberLocationAssignmentsStore);
      await settle();

      store.toggleActive(store.assignments()[0]);

      expect(store.assignments()).toEqual([
        expect.objectContaining({ id: 1, isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deleteAssignment', () => {
    it('sends the row id', async () => {
      const store = TestBed.inject(StaffMemberLocationAssignmentsStore);
      await settle();

      store.deleteAssignment(store.assignments()[0]);

      expect(apiMock.deleteStaffMemberLocationAssignment).toHaveBeenCalledWith(1);
    });
  });
});
