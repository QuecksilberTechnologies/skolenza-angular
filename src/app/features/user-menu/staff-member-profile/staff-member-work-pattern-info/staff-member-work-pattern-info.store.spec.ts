import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { StaffMemberWorkArrangementApi, StaffMemberWorkPatternApi } from '@core/services';
import {
  StaffMemberWorkArrangementRow,
  StaffMemberWorkPatternRow,
  HybridType,
  WorkMode,
  WorkPatternDay,
} from '@shared/interfaces';

import { StaffMemberWorkPatternsStore } from './staff-member-work-pattern-info.store';

function createArrangement(overrides: Partial<StaffMemberWorkArrangementRow> = {}) {
  return {
    id: 1,
    staffMemberId: 'XGQRD0Z8',
    policyVersionId: 4,
    primaryCampusId: 3,
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

function createPattern(overrides: Partial<StaffMemberWorkPatternRow> = {}) {
  return {
    id: 1,
    staffMemberId: 'XGQRD0Z8',
    staffMemberName: 'Sumit Verma',
    staffMemberWorkArrangementId: 1,
    dayOfWeek: WorkPatternDay.Monday,
    workMode: WorkMode.Office,
    campusId: 3,
    isWorkingDay: true,
    isActive: true,
    ...overrides,
  } satisfies StaffMemberWorkPatternRow;
}

const ok = <T>(data: T[]) => of({ isSucceeded: true, message: '', errors: [], data });

describe('StaffMemberWorkPatternsStore', () => {
  const arrangementApiMock = { getStaffMemberWorkArrangements: vi.fn() };
  const patternApiMock = {
    getStaffMemberWorkPatterns: vi.fn(),
    deleteStaffMemberWorkPattern: vi.fn(),
    setStaffMemberWorkPatternStatus: vi.fn(),
  };

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    vi.clearAllMocks();
    arrangementApiMock.getStaffMemberWorkArrangements.mockReturnValue(ok([createArrangement()]));
    patternApiMock.getStaffMemberWorkPatterns.mockReturnValue(ok([createPattern()]));
    patternApiMock.deleteStaffMemberWorkPattern.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: null }),
    );
    patternApiMock.setStaffMemberWorkPatternStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Updated.', errors: [], data: null }),
    );

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        DatePipe,
        StaffMemberWorkPatternsStore,
        { provide: StaffMemberWorkArrangementApi, useValue: arrangementApiMock },
        { provide: StaffMemberWorkPatternApi, useValue: patternApiMock },
      ],
    });
  });

  it('lists every pattern when no staffMember is chosen', async () => {
    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    await settle();

    expect(arrangementApiMock.getStaffMemberWorkArrangements).not.toHaveBeenCalled();
    expect(patternApiMock.getStaffMemberWorkPatterns).toHaveBeenCalledWith(
      expect.objectContaining({ StaffMemberWorkArrangementId: null, PageNumber: 1, PageSize: 10 }),
    );
    expect(store.takenDays()).toEqual([]);
  });

  it('sends the day and status filters and returns to page one', async () => {
    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.loadPage({ first: 10, rows: 10 });
    await settle();

    store.setDayOfWeek(WorkPatternDay.Friday);
    store.setIsActive(false);
    await settle();

    expect(patternApiMock.getStaffMemberWorkPatterns).toHaveBeenLastCalledWith(
      expect.objectContaining({ DayOfWeek: WorkPatternDay.Friday, IsActive: false, PageNumber: 1 }),
    );
  });

  /**
   * The backend still binds `StaffMemberId` as an int64 and 400s on the 8-character code, but the tab
   * sends it regardless so the request is visible and the error is the backend's to answer for.
   */
  it('asks for the arrangements of a non-numeric staffMember code', async () => {
    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.setStaffMemberId('XGQRD0Z8');
    await settle();

    expect(arrangementApiMock.getStaffMemberWorkArrangements).toHaveBeenCalledWith(
      expect.objectContaining({ StaffMemberId: 'XGQRD0Z8' }),
    );
  });

  it('lists the patterns of the active arrangement', async () => {
    arrangementApiMock.getStaffMemberWorkArrangements.mockReturnValue(
      ok([
        createArrangement({ id: 8, isActive: false }),
        createArrangement({ id: 9, isActive: true }),
      ]),
    );

    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.setStaffMemberId('XGQRD0Z8');
    await settle();

    expect(arrangementApiMock.getStaffMemberWorkArrangements).toHaveBeenCalledWith(
      expect.objectContaining({ StaffMemberId: 'XGQRD0Z8' }),
    );
    // The inactive arrangement comes first in the payload; the active one still wins.
    expect(store.currentArrangement()?.id).toBe(9);
    expect(patternApiMock.getStaffMemberWorkPatterns).toHaveBeenCalledWith(
      expect.objectContaining({ StaffMemberWorkArrangementId: 9 }),
    );
  });

  it('lets the user select another active dated arrangement', async () => {
    arrangementApiMock.getStaffMemberWorkArrangements.mockReturnValue(
      ok([
        createArrangement({ id: 9, effectiveFrom: '2026-01-01' }),
        createArrangement({ id: 10, effectiveFrom: '2027-01-01' }),
      ]),
    );

    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.setStaffMemberId('XGQRD0Z8');
    await settle();

    store.setArrangementId(10);
    await settle();

    expect(store.currentArrangement()?.id).toBe(10);
    expect(patternApiMock.getStaffMemberWorkPatterns).toHaveBeenLastCalledWith(
      expect.objectContaining({ StaffMemberWorkArrangementId: 10 }),
    );
  });

  it('does not configure patterns against an inactive arrangement', async () => {
    arrangementApiMock.getStaffMemberWorkArrangements.mockReturnValue(
      ok([createArrangement({ id: 8, isActive: false })]),
    );

    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.setStaffMemberId('XGQRD0Z8');
    await settle();

    expect(store.currentArrangement()).toBeNull();
  });

  it('asks for no patterns when the chosen staffMember has no arrangement', async () => {
    arrangementApiMock.getStaffMemberWorkArrangements.mockReturnValue(ok([]));

    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.setStaffMemberId('XGQRD0Z8');
    await settle();

    expect(store.currentArrangement()).toBeNull();
    expect(patternApiMock.getStaffMemberWorkPatterns).not.toHaveBeenCalled();
  });

  it('drops the previous staffMember rows and loads the next staffMember', async () => {
    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.setStaffMemberId('XGQRD0Z8');
    await settle();
    expect(store.patterns()).toHaveLength(1);

    arrangementApiMock.getStaffMemberWorkArrangements.mockReturnValue(ok([]));
    store.setStaffMemberId('AB12CD34');

    expect(store.patterns()).toEqual([]);
    await settle();
    expect(arrangementApiMock.getStaffMemberWorkArrangements).toHaveBeenLastCalledWith(
      expect.objectContaining({ StaffMemberId: 'AB12CD34' }),
    );
    expect(store.currentArrangement()).toBeNull();
  });

  it('reports the days already configured', async () => {
    patternApiMock.getStaffMemberWorkPatterns.mockReturnValue(
      ok([
        createPattern({ id: 1, dayOfWeek: WorkPatternDay.Monday }),
        createPattern({ id: 2, dayOfWeek: WorkPatternDay.Tuesday }),
      ]),
    );

    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.setStaffMemberId('XGQRD0Z8');
    await settle();

    expect(store.takenDays()).toEqual([WorkPatternDay.Monday, WorkPatternDay.Tuesday]);
  });

  it('steps back a page when a later page comes back empty', async () => {
    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    await settle();

    patternApiMock.getStaffMemberWorkPatterns.mockReturnValueOnce(ok([]));
    store.loadPage({ first: 10, rows: 10 });
    await settle();

    expect(store.pageNumber()).toBe(1);
    expect(patternApiMock.getStaffMemberWorkPatterns).toHaveBeenLastCalledWith(
      expect.objectContaining({ PageNumber: 1 }),
    );
  });

  it('keeps page one when it comes back empty', async () => {
    patternApiMock.getStaffMemberWorkPatterns.mockReturnValue(ok([]));
    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    await settle();

    expect(store.pageNumber()).toBe(1);
    expect(patternApiMock.getStaffMemberWorkPatterns).toHaveBeenCalledTimes(1);
  });

  it('clears the rows when the pattern call fails', async () => {
    patternApiMock.getStaffMemberWorkPatterns.mockReturnValue(throwError(() => new Error('boom')));

    const store = TestBed.inject(StaffMemberWorkPatternsStore);
    store.setStaffMemberId('XGQRD0Z8');
    await settle();

    expect(store.patterns()).toEqual([]);
    expect(store.isLoading()).toBe(false);
  });

  describe('toggleActive', () => {
    it('sends the row id with the flipped status and refetches', async () => {
      const store = TestBed.inject(StaffMemberWorkPatternsStore);
      store.setStaffMemberId('XGQRD0Z8');
      await settle();
      patternApiMock.getStaffMemberWorkPatterns.mockClear();

      store.toggleActive(store.patterns()[0]);
      await settle();

      expect(patternApiMock.setStaffMemberWorkPatternStatus).toHaveBeenCalledWith({
        id: 1,
        isActive: false,
      });
      expect(patternApiMock.getStaffMemberWorkPatterns).toHaveBeenCalledTimes(1);
    });

    it('clears the row spinner when the call fails', async () => {
      patternApiMock.setStaffMemberWorkPatternStatus.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      const store = TestBed.inject(StaffMemberWorkPatternsStore);
      store.setStaffMemberId('XGQRD0Z8');
      await settle();

      store.toggleActive(store.patterns()[0]);

      expect(store.patterns()).toEqual([
        expect.objectContaining({ id: 1, isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deletePattern', () => {
    it('sends the row id', async () => {
      const store = TestBed.inject(StaffMemberWorkPatternsStore);
      store.setStaffMemberId('XGQRD0Z8');
      await settle();

      store.deletePattern(store.patterns()[0]);

      expect(patternApiMock.deleteStaffMemberWorkPattern).toHaveBeenCalledWith(1);
    });

    it('clears the row spinner when the call fails', async () => {
      patternApiMock.deleteStaffMemberWorkPattern.mockReturnValue(throwError(() => new Error('boom')));
      const store = TestBed.inject(StaffMemberWorkPatternsStore);
      store.setStaffMemberId('XGQRD0Z8');
      await settle();

      store.deletePattern(store.patterns()[0]);

      expect(store.patterns()).toEqual([expect.objectContaining({ id: 1, isDeleting: false })]);
    });
  });
});
