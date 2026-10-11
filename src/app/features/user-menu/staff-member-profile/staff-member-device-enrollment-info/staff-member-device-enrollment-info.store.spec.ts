import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DeviceDdlOptionsApi, StaffMemberDeviceEnrollmentApi } from '@core/services';
import { StaffMemberDeviceEnrollmentRow } from '@shared/interfaces';

import { StaffMemberDeviceEnrollmentsStore } from './staff-member-device-enrollment-info.store';

function createEnrollment(overrides: Partial<StaffMemberDeviceEnrollmentRow> = {}) {
  return {
    id: 'enc-1',
    staffMemberId: 'XGQRD0Z8',
    institutionDeviceId: 'dev-1',
    accessEffectiveFromDateTime: null,
    accessEffectiveToDateTime: null,
    accessWindows: null,
    isActive: true,
    ...overrides,
  } satisfies StaffMemberDeviceEnrollmentRow;
}

const ok = <T>(data: T[], totalRecords = data.length) =>
  of({ isSucceeded: true, message: '', errors: [], data, totalRecords });

const mutated = (message: string) => of({ isSucceeded: true, message, errors: [], data: null });

describe('StaffMemberDeviceEnrollmentsStore', () => {
  const apiMock = {
    getStaffMemberDeviceEnrollments: vi.fn(),
    setStaffMemberDeviceEnrollmentStatus: vi.fn(),
    deleteStaffMemberDeviceEnrollment: vi.fn(),
    removeStaffMemberDeviceCredential: vi.fn(),
  };
  const ddlMock = { getStaffMemberDeviceCredentials: vi.fn() };

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getStaffMemberDeviceEnrollments.mockReturnValue(ok([createEnrollment()], 12));
    apiMock.setStaffMemberDeviceEnrollmentStatus.mockReturnValue(mutated('Updated.'));
    apiMock.deleteStaffMemberDeviceEnrollment.mockReturnValue(mutated('Deleted.'));
    ddlMock.getStaffMemberDeviceCredentials.mockReturnValue(ok([]));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        StaffMemberDeviceEnrollmentsStore,
        { provide: StaffMemberDeviceEnrollmentApi, useValue: apiMock },
        { provide: DeviceDdlOptionsApi, useValue: ddlMock },
      ],
    });
  });

  it('lists every enrollment when no staffMember is chosen', async () => {
    const store = TestBed.inject(StaffMemberDeviceEnrollmentsStore);
    await settle();

    expect(apiMock.getStaffMemberDeviceEnrollments).toHaveBeenCalledWith(
      expect.objectContaining({ StaffMemberId: null, Search: null, PageNumber: 1, PageSize: 10 }),
    );
    expect(store.totalRecords()).toBe(12);
  });

  it('sends the staffMember, location and status filters and returns to page one', async () => {
    const store = TestBed.inject(StaffMemberDeviceEnrollmentsStore);
    store.loadPage({ first: 10, rows: 10 });
    await settle();

    store.setStaffMemberId('XGQRD0Z8');
    store.setCampusId(3);
    store.setIsActive(true);
    await settle();

    expect(apiMock.getStaffMemberDeviceEnrollments).toHaveBeenLastCalledWith(
      expect.objectContaining({
        StaffMemberId: 'XGQRD0Z8',
        CampusId: 3,
        IsActive: true,
        PageNumber: 1,
      }),
    );
  });

  it('clears the rows when the call fails', async () => {
    apiMock.getStaffMemberDeviceEnrollments.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(StaffMemberDeviceEnrollmentsStore);
    await settle();

    expect(store.enrollments()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });

  it('toggleActive sends the flipped status and refetches', async () => {
    const store = TestBed.inject(StaffMemberDeviceEnrollmentsStore);
    await settle();
    apiMock.getStaffMemberDeviceEnrollments.mockClear();

    store.toggleActive(store.enrollments()[0]);
    await settle();

    expect(apiMock.setStaffMemberDeviceEnrollmentStatus).toHaveBeenCalledWith({
      id: 'enc-1',
      isActive: false,
    });
    expect(apiMock.getStaffMemberDeviceEnrollments).toHaveBeenCalledTimes(1);
  });

  it('unbindCard does nothing while the card credential type is unknown', async () => {
    const store = TestBed.inject(StaffMemberDeviceEnrollmentsStore);
    await settle();

    store.unbindCard(store.enrollments()[0]);

    expect(apiMock.removeStaffMemberDeviceCredential).not.toHaveBeenCalled();
  });

  it('deleteEnrollment sends the row id', async () => {
    const store = TestBed.inject(StaffMemberDeviceEnrollmentsStore);
    await settle();

    store.deleteEnrollment(store.enrollments()[0]);

    expect(apiMock.deleteStaffMemberDeviceEnrollment).toHaveBeenCalledWith('enc-1');
  });

  it('deleteEnrollment steps back a page when it removes the last row on a later page', async () => {
    const store = TestBed.inject(StaffMemberDeviceEnrollmentsStore);
    store.loadPage({ first: 10, rows: 10 });
    await settle();
    expect(store.pageNumber()).toBe(2);

    store.deleteEnrollment(store.enrollments()[0]);
    await settle();

    expect(store.pageNumber()).toBe(1);
    expect(apiMock.getStaffMemberDeviceEnrollments).toHaveBeenLastCalledWith(
      expect.objectContaining({ PageNumber: 1 }),
    );
  });
});
