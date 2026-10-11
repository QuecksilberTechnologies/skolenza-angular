import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { NEVER, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { StaffMemberWorkModeOverrideApi } from '@core/services';
import {
  StaffMemberWorkModeOverrideRow,
  WorkMode,
  WorkModeOverrideApprovalStatus,
} from '@shared/interfaces';

import { StaffMemberWorkModeOverridesStore } from './staff-member-work-mode-override-info.store';

function createOverride(overrides: Partial<StaffMemberWorkModeOverrideRow> = {}) {
  return {
    id: 1,
    staffMemberId: 'XGQRD0Z8',
    staffMemberWorkArrangementId: 9,
    requestedWorkMode: WorkMode.WorkFromHome,
    fromDate: '2026-09-01',
    toDate: '2026-09-05',
    campusId: null,
    reason: null,
    isActive: true,
    ...overrides,
  } satisfies StaffMemberWorkModeOverrideRow;
}

const ok = <T>(data: T[]) => of({ isSucceeded: true, message: '', errors: [], data });

const mutated = (message: string) => of({ isSucceeded: true, message, errors: [], data: null });

describe('StaffMemberWorkModeOverridesStore', () => {
  const apiMock = {
    getStaffMemberWorkModeOverrides: vi.fn(),
    setStaffMemberWorkModeOverrideStatus: vi.fn(),
    deleteStaffMemberWorkModeOverride: vi.fn(),
    approveStaffMemberWorkModeOverride: vi.fn(),
    rejectStaffMemberWorkModeOverride: vi.fn(),
  };

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getStaffMemberWorkModeOverrides.mockReturnValue(ok([createOverride()]));
    apiMock.setStaffMemberWorkModeOverrideStatus.mockReturnValue(mutated('Updated.'));
    apiMock.deleteStaffMemberWorkModeOverride.mockReturnValue(mutated('Deleted.'));
    apiMock.approveStaffMemberWorkModeOverride.mockReturnValue(mutated('Approved.'));
    apiMock.rejectStaffMemberWorkModeOverride.mockReturnValue(mutated('Rejected.'));

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        StaffMemberWorkModeOverridesStore,
        { provide: StaffMemberWorkModeOverrideApi, useValue: apiMock },
      ],
    });
  });

  it('lists every override when no staffMember is chosen', async () => {
    const store = TestBed.inject(StaffMemberWorkModeOverridesStore);
    await settle();

    expect(apiMock.getStaffMemberWorkModeOverrides).toHaveBeenCalledWith(
      expect.objectContaining({ StaffMemberId: null, Search: null, PageNumber: 1, PageSize: 10 }),
    );
    // No `totalRecords` in the payload: the row count stands in for it.
    expect(store.totalRecords()).toBe(1);
  });

  it('sends the staffMember, approval and status filters and returns to page one', async () => {
    const store = TestBed.inject(StaffMemberWorkModeOverridesStore);
    store.loadPage({ first: 10, rows: 10 });
    await settle();

    store.setStaffMemberId('XGQRD0Z8');
    store.setApprovalStatus(WorkModeOverrideApprovalStatus.Pending);
    store.setIsActive(false);
    await settle();

    expect(apiMock.getStaffMemberWorkModeOverrides).toHaveBeenLastCalledWith(
      expect.objectContaining({
        StaffMemberId: 'XGQRD0Z8',
        ApprovalStatus: WorkModeOverrideApprovalStatus.Pending,
        IsActive: false,
        PageNumber: 1,
      }),
    );
    // The paginator reads `first`, so it has to follow the reset back to page one.
    expect(store.first()).toBe(0);
  });

  it('clears the rows when the call fails', async () => {
    apiMock.getStaffMemberWorkModeOverrides.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(StaffMemberWorkModeOverridesStore);
    await settle();

    expect(store.overrides()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });

  it('toggleActive sends the flipped status and refetches', async () => {
    const store = TestBed.inject(StaffMemberWorkModeOverridesStore);
    await settle();
    apiMock.getStaffMemberWorkModeOverrides.mockClear();

    store.toggleActive(store.overrides()[0]);
    await settle();

    expect(apiMock.setStaffMemberWorkModeOverrideStatus).toHaveBeenCalledWith({
      id: 1,
      isActive: false,
    });
    expect(apiMock.getStaffMemberWorkModeOverrides).toHaveBeenCalledTimes(1);
  });

  it('deleteOverride sends the row id', async () => {
    const store = TestBed.inject(StaffMemberWorkModeOverridesStore);
    await settle();

    store.deleteOverride(store.overrides()[0]);

    expect(apiMock.deleteStaffMemberWorkModeOverride).toHaveBeenCalledWith(1);
  });

  it('approves a pending override through the approval endpoint', async () => {
    const store = TestBed.inject(StaffMemberWorkModeOverridesStore);
    await settle();

    store.decideOverride(store.overrides()[0], true, 'Approved for client visit');

    expect(apiMock.approveStaffMemberWorkModeOverride).toHaveBeenCalledWith({
      id: 1,
      remark: 'Approved for client visit',
    });
  });

  it('rejects a pending override with the required remark', async () => {
    const store = TestBed.inject(StaffMemberWorkModeOverridesStore);
    await settle();

    store.decideOverride(store.overrides()[0], false, 'Dates conflict with another visit');

    expect(apiMock.rejectStaffMemberWorkModeOverride).toHaveBeenCalledWith({
      id: 1,
      remark: 'Dates conflict with another visit',
    });
  });

  it('ignores a second decision while the first is still in flight', async () => {
    apiMock.approveStaffMemberWorkModeOverride.mockReturnValue(NEVER);
    const store = TestBed.inject(StaffMemberWorkModeOverridesStore);
    await settle();

    store.decideOverride(store.overrides()[0], true);
    store.decideOverride(store.overrides()[0], true);
    store.deleteOverride(store.overrides()[0]);

    expect(apiMock.approveStaffMemberWorkModeOverride).toHaveBeenCalledTimes(1);
    expect(apiMock.deleteStaffMemberWorkModeOverride).not.toHaveBeenCalled();
  });
});
