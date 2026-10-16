import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Common, ReportTypeApi } from '@core/services';
import { ReportType, SettledSearchTerm } from '@shared/interfaces';

import { ReportTypeStore } from './report-type.store';

function createReportType(overrides: Partial<ReportType> = {}): ReportType {
  return {
    id: 1,
    typeName: 'Attendance Summary',
    description: 'Daily attendance rollup',
    isActive: true,
    ...overrides,
  };
}

const loginInfo = {
  user: { staffMemberId: 'emp-guid-1', primaryRole: { roleId: 4 } },
};

describe('ReportTypeStore', () => {
  const reportTypeApiMock = {
    getReportTypes: vi.fn(),
    updateReportType: vi.fn(),
    deleteReportType: vi.fn(),
  };

  const commonMock = {
    getLoginInfo: vi.fn(),
    showMessage: vi.fn(),
    getPaginationParam: (event: { first?: number; rows?: number; sortField?: string }) => {
      const rows = event.rows ?? 10;
      return {
        page: Math.floor((event.first ?? 0) / rows) + 1,
        rows,
        sortField: event.sortField,
        sortOrder: 'desc',
      };
    },
  };

  const createStore = (reportTypes: ReportType[]) => {
    const store = TestBed.inject(ReportTypeStore);
    patchState(store as never, { reportTypes });
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    commonMock.getLoginInfo.mockResolvedValue(loginInfo);
    reportTypeApiMock.getReportTypes.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [], totalRecords: 0 }),
    );
    reportTypeApiMock.updateReportType.mockReturnValue(
      of({ isSucceeded: true, message: 'Updated.', errors: [], data: [] }),
    );
    reportTypeApiMock.deleteReportType.mockReturnValue(
      of({ isSucceeded: true, message: 'Deleted.', errors: [], data: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        ReportTypeStore,
        { provide: ReportTypeApi, useValue: reportTypeApiMock },
        { provide: Common, useValue: commonMock },
      ],
    });
  });

  it('keeps the rows and total from a successful page', async () => {
    reportTypeApiMock.getReportTypes.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [createReportType({ id: 7 })],
        totalRecords: 42,
      }),
    );

    const store = TestBed.inject(ReportTypeStore);
    await store.loadReportTypes({ first: 0, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.reportTypes().map((row) => row.id)).toEqual([7]);
    expect(store.totalRecords()).toBe(42);
  });

  /** The resource used to fire on construction, then again from the table's init lazy load. */
  it('stays idle until the first lazy load', async () => {
    const store = TestBed.inject(ReportTypeStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(reportTypeApiMock.getReportTypes).not.toHaveBeenCalled();
    // An idle resource reports `isLoading() === false`; the grid must not flash its empty state.
    expect(store.isLoading()).toBe(true);
  });

  describe('status filter', () => {
    /** The grid used to hardcode `IsActive: true`, so inactive rows were unreachable. */
    it('sends the selected status as IsActive', async () => {
      const store = TestBed.inject(ReportTypeStore);
      await TestBed.inject(ApplicationRef).whenStable();

      await store.loadReportTypes({ first: 0, rows: 10 }, true, { status: false });
      await TestBed.inject(ApplicationRef).whenStable();

      expect(reportTypeApiMock.getReportTypes).toHaveBeenLastCalledWith(
        expect.objectContaining({ IsActive: false }),
      );
    });

    it('omits IsActive for the "All" choice', async () => {
      const store = TestBed.inject(ReportTypeStore);
      await store.loadReportTypes({ first: 0, rows: 10 }, true, { status: null });
      await TestBed.inject(ApplicationRef).whenStable();

      expect(reportTypeApiMock.getReportTypes).toHaveBeenLastCalledWith(
        expect.objectContaining({ IsActive: undefined }),
      );
    });

    it('counts only the filters that are set', async () => {
      const store = TestBed.inject(ReportTypeStore);

      expect(store.appliedFilterCount()).toBe(0);

      store.updateAppliedFilters({ status: true });
      expect(store.appliedFilterCount()).toBe(1);

      store.updateAppliedFilters({ status: null });
      expect(store.appliedFilterCount()).toBe(0);
    });
  });

  describe('loadReportTypes', () => {
    it('sends the requested page back to the API', async () => {
      const store = TestBed.inject(ReportTypeStore);
      await store.loadReportTypes({ first: 20, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();

      expect(reportTypeApiMock.getReportTypes).toHaveBeenLastCalledWith(
        expect.objectContaining({ PageNumber: 3, PageSize: 10 }),
      );
    });

    it('keeps the current page when the caller is not paging', async () => {
      const store = TestBed.inject(ReportTypeStore);
      await store.loadReportTypes({ first: 20, rows: 10 });
      await store.loadReportTypes({ first: 0, rows: 10 }, false);

      expect(store.pageNumber()).toBe(3);
    });

    it('leaves the applied filters alone when none are passed', async () => {
      const store = TestBed.inject(ReportTypeStore);
      store.updateAppliedFilters({ status: true });

      await store.loadReportTypes({ first: 0, rows: 10 });

      expect(store.appliedFilters()).toEqual({ status: true });
    });
  });

  describe('toggleReportTypeStatus', () => {
    it('sends the flipped status for the row', async () => {
      const store = createStore([createReportType({ id: 7, isActive: true })]);

      await store.toggleReportTypeStatus(store.reportTypes()[0]);

      expect(reportTypeApiMock.updateReportType).toHaveBeenCalledWith({
        id: 7,
        staffMemberId: 0,
        roleId: 4,
        typeName: 'Attendance Summary',
        description: 'Daily attendance rollup',
        isActive: false,
      });
    });

    it('clears the row spinner when the call fails', async () => {
      reportTypeApiMock.updateReportType.mockReturnValue(throwError(() => new Error('boom')));
      const store = createStore([createReportType({ id: 7, isActive: true })]);

      await store.toggleReportTypeStatus(store.reportTypes()[0]);

      expect(store.reportTypes()).toEqual([
        expect.objectContaining({ id: 7, isActive: true, isUpdatingStatus: false }),
      ]);
    });
  });

  describe('deleteReportType', () => {
    /** `/ReportingType/delete` takes `Id` and nothing else. */
    it('sends only the row id', () => {
      const store = createStore([createReportType({ id: 7 })]);

      store.deleteReportType(store.reportTypes()[0]);

      expect(reportTypeApiMock.deleteReportType).toHaveBeenCalledWith({ Id: 7 });
    });

    it('drops the row once the backend confirms', () => {
      const store = createStore([createReportType({ id: 7 }), createReportType({ id: 8 })]);

      store.deleteReportType(store.reportTypes()[0]);

      expect(store.reportTypes().map((row) => row.id)).toEqual([8]);
    });

    it('keeps the row when the backend rejects the delete', () => {
      reportTypeApiMock.deleteReportType.mockReturnValue(
        of({ isSucceeded: false, message: 'Report type is in use.', errors: [], data: [] }),
      );
      const store = createStore([createReportType({ id: 7 })]);

      store.deleteReportType(store.reportTypes()[0]);

      expect(store.reportTypes().map((row) => row.id)).toEqual([7]);
      expect(commonMock.showMessage).toHaveBeenCalledWith('Report type is in use.', 'error');
    });
  });

  it('setSearch sends the term as TypeName from page 1', async () => {
    const store = TestBed.inject(ReportTypeStore);
    await store.loadReportTypes({ first: 20, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();
    reportTypeApiMock.getReportTypes.mockClear();

    store.setSearch('audit' as SettledSearchTerm);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(reportTypeApiMock.getReportTypes).toHaveBeenCalledTimes(1);
    expect(reportTypeApiMock.getReportTypes).toHaveBeenCalledWith(
      expect.objectContaining({ TypeName: 'audit', PageNumber: 1 }),
    );
  });
});
