import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { StaffMemberWorkArrangementApi } from '@core/services';
import { StaffMemberWorkArrangementRow, HybridType, WorkMode } from '@shared/interfaces';

import { StaffMemberWorkArrangementsStore } from './staffMember-work-arrangement-info.store';

function createArrangement(overrides: Partial<StaffMemberWorkArrangementRow> = {}) {
  return {
    id: 1,
    staffMemberId: 'XGQRD0Z8',
    policyVersionId: 4,
    primaryInstitutionLocationId: 3,
    workMode: WorkMode.Hybrid,
    hybridType: HybridType.Fixed,
    minimumOfficeDaysPerWeek: null,
    minimumOfficeDaysPerMonth: null,
    maximumWFHDaysPerMonth: null,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    isActive: true,
    ...overrides,
  } satisfies StaffMemberWorkArrangementRow;
}

const ok = <T>(data: T[], totalRecords = data.length) =>
  of({ isSucceeded: true, message: '', errors: [], data, totalRecords });

const mutated = (message: string) => of({ isSucceeded: true, message, errors: [], data: null });

describe('StaffMemberWorkArrangementsStore', () => {
  const apiMock = {
    getStaffMemberWorkArrangements: vi.fn(),
    setStaffMemberWorkArrangementStatus: vi.fn(),
    deleteStaffMemberWorkArrangement: vi.fn(),
  };

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getStaffMemberWorkArrangements.mockReturnValue(ok([createArrangement()], 31));
    apiMock.setStaffMemberWorkArrangementStatus.mockReturnValue(mutated('Updated.'));
    apiMock.deleteStaffMemberWorkArrangement.mockReturnValue(mutated('Deleted.'));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        StaffMemberWorkArrangementsStore,
        { provide: StaffMemberWorkArrangementApi, useValue: apiMock },
      ],
    });
  });

  it('lists every arrangement when no staffMember is chosen', async () => {
    const store = TestBed.inject(StaffMemberWorkArrangementsStore);
    await settle();

    expect(apiMock.getStaffMemberWorkArrangements).toHaveBeenCalledWith(
      expect.objectContaining({ StaffMemberId: null, PageNumber: 1, PageSize: 10 }),
    );
    expect(store.totalRecords()).toBe(31);
    // Without one staffMember chosen, an active row says nothing about who may get a new one.
    expect(store.hasActiveArrangement()).toBe(false);
  });

  it('sends the staffMember, work mode and status filters and returns to page one', async () => {
    const store = TestBed.inject(StaffMemberWorkArrangementsStore);
    store.loadPage({ first: 10, rows: 10 });
    await settle();

    store.setStaffMemberId('XGQRD0Z8');
    store.setWorkMode(WorkMode.Office);
    store.setIsActive(true);
    await settle();

    expect(apiMock.getStaffMemberWorkArrangements).toHaveBeenLastCalledWith(
      expect.objectContaining({
        StaffMemberId: 'XGQRD0Z8',
        WorkMode: WorkMode.Office,
        IsActive: true,
        PageNumber: 1,
      }),
    );
    expect(store.hasActiveArrangement()).toBe(true);
  });

  it('clears the rows when the call fails', async () => {
    apiMock.getStaffMemberWorkArrangements.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(StaffMemberWorkArrangementsStore);
    await settle();

    expect(store.arrangements()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });

  it('toggleActive sends the flipped status and refetches', async () => {
    const store = TestBed.inject(StaffMemberWorkArrangementsStore);
    await settle();
    apiMock.getStaffMemberWorkArrangements.mockClear();

    store.toggleActive(store.arrangements()[0]);
    await settle();

    expect(apiMock.setStaffMemberWorkArrangementStatus).toHaveBeenCalledWith({
      id: 1,
      isActive: false,
    });
    expect(apiMock.getStaffMemberWorkArrangements).toHaveBeenCalledTimes(1);
  });

  it('deleteArrangement sends the row id', async () => {
    const store = TestBed.inject(StaffMemberWorkArrangementsStore);
    await settle();

    store.deleteArrangement(store.arrangements()[0]);

    expect(apiMock.deleteStaffMemberWorkArrangement).toHaveBeenCalledWith(1);
  });
});
