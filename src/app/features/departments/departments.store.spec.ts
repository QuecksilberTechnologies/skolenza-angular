import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, DepartmentsApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { Department, NO_SEARCH_TERM, SettledSearchTerm } from '@shared/interfaces';

import { DepartmentsStore } from './departments.store';

function createDepartment(overrides: Partial<Department> = {}): Department {
  return {
    id: 1,
    departmentName: 'Engineering',
    description: 'Builds the product',
    remark: '',
    isActive: true,
    ...overrides,
  } as Department;
}

const loginInfo = {
  user: { staffMemberId: 'emp-guid-1', primaryRole: { roleId: 4 } },
};

describe('DepartmentsStore', () => {
  const departmentsApiMock = {
    getDepartments: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
  };

  const lookupStoreMock = { reloadDepartmentOptions: vi.fn() };

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

  beforeEach(() => {
    vi.clearAllMocks();
    commonMock.getLoginInfo.mockResolvedValue(loginInfo);
    departmentsApiMock.getDepartments.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [createDepartment()],
        totalRecords: 30,
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        DepartmentsStore,
        { provide: DepartmentsApi, useValue: departmentsApiMock },
        { provide: Common, useValue: commonMock },
        { provide: LookupStore, useValue: lookupStoreMock },
      ],
    });
  });

  /** The resource used to fire on construction, then again from the table's init lazy load. */
  it('stays idle until the first lazy load, then fetches once', async () => {
    const store = TestBed.inject(DepartmentsStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(departmentsApiMock.getDepartments).not.toHaveBeenCalled();
    // An idle resource reports `isLoading() === false`; the grid must not flash its empty state.
    expect(store.isLoading()).toBe(true);

    await store.loadDepartments({ first: 0, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(departmentsApiMock.getDepartments).toHaveBeenCalledTimes(1);
    expect(departmentsApiMock.getDepartments).toHaveBeenCalledWith(
      expect.objectContaining({ PageNumber: 1, UserStaffMemberId: 'emp-guid-1' }),
    );
    expect(store.departments()).toHaveLength(1);
    expect(store.totalRecords()).toBe(30);
  });

  it('still fetches for a session that carries no staffMember id', async () => {
    // Host sessions have no `user`; keying the idle guard on truthiness stranded the grid
    // forever — no request, no error, no retry.
    commonMock.getLoginInfo.mockResolvedValue(null);

    const store = TestBed.inject(DepartmentsStore);
    await store.loadDepartments({ first: 0, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(departmentsApiMock.getDepartments).toHaveBeenCalledTimes(1);
    expect(departmentsApiMock.getDepartments).toHaveBeenCalledWith(
      expect.objectContaining({ PageNumber: 1, UserStaffMemberId: undefined }),
    );
    expect(store.isLoading()).toBe(false);
  });

  describe('reloadFirstPage', () => {
    it('sends a single request when the grid is already on page 1', async () => {
      const store = TestBed.inject(DepartmentsStore);
      await store.loadDepartments({ first: 0, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();
      departmentsApiMock.getDepartments.mockClear();

      store.reloadFirstPage();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(departmentsApiMock.getDepartments).toHaveBeenCalledTimes(1);
    });

    it('sends a single request for page 1 when the grid is elsewhere', async () => {
      const store = TestBed.inject(DepartmentsStore);
      await store.loadDepartments({ first: 20, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();
      departmentsApiMock.getDepartments.mockClear();

      store.reloadFirstPage();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(departmentsApiMock.getDepartments).toHaveBeenCalledTimes(1);
      expect(departmentsApiMock.getDepartments).toHaveBeenCalledWith(
        expect.objectContaining({ PageNumber: 1 }),
      );
    });
  });

  describe('setSearch', () => {
    it('sends the term as DepartmentName, from page 1, in one request', async () => {
      const store = TestBed.inject(DepartmentsStore);
      await store.loadDepartments({ first: 20, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();
      departmentsApiMock.getDepartments.mockClear();

      store.setSearch('eng' as SettledSearchTerm);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(departmentsApiMock.getDepartments).toHaveBeenCalledTimes(1);
      expect(departmentsApiMock.getDepartments).toHaveBeenCalledWith(
        expect.objectContaining({ DepartmentName: 'eng', PageNumber: 1 }),
      );
    });

    it('drops DepartmentName once the box is cleared', async () => {
      const store = TestBed.inject(DepartmentsStore);
      await store.loadDepartments({ first: 0, rows: 10 });
      store.setSearch('eng' as SettledSearchTerm);
      await TestBed.inject(ApplicationRef).whenStable();
      departmentsApiMock.getDepartments.mockClear();

      store.setSearch(NO_SEARCH_TERM);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(departmentsApiMock.getDepartments).toHaveBeenCalledWith(
        expect.objectContaining({ DepartmentName: undefined }),
      );
    });
  });
});
