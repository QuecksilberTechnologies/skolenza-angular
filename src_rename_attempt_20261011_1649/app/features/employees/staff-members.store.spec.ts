import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, DesignationsApi, StaffMembersApi, RolesApi } from '@core/services';
import { GetAllStaffMembersReq, IStaffMember } from '@shared/interfaces';

import { StaffMembersStore } from './staffMembers.store';

function createStaffMember(overrides: Partial<IStaffMember> = {}): IStaffMember {
  return {
    staffMemberId: 'emp-2',
    employementCode: 'AX-002',
    firstName: 'Asha',
    middleName: '',
    lastName: 'Rao',
    genderId: 2,
    genderName: 'Female',
    countryId: 1,
    nationality: 'Indian',
    dateOfBirth: '1995-01-01',
    dateOfOnBoarding: '2024-01-01',
    departmentId: 3,
    departmentName: 'Engineering',
    designationId: 4,
    designationName: 'Engineer',
    staffEmploymentTypeId: 1,
    staffEmploymentTypeName: 'Full Time',
    officialEmail: 'asha@skolenza.test',
    countryCode: '+91',
    isActive: true,
    completionPercentage: 80,
    hasImagePicUploaded: false,
    summaryStaffMemberInfo: {} as IStaffMember['summaryStaffMemberInfo'],
    isUpdatingStatus: false,
    ...overrides,
  };
}

const loginInfo = {
  user: { staffMemberId: 'emp-1', primaryRole: { roleTypeId: 1 } },
};

const emptyPage = {
  isSucceeded: true,
  message: '',
  errors: [],
  data: [],
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
  totalPages: 0,
};

describe('StaffMembersStore', () => {
  const staffMembersApiMock = {
    getAllStaffMembers: vi.fn(),
    getStaffMemberStatistics: vi.fn(),
    deleteStaffMember: vi.fn(),
    updateStaffMemberUpdateStatus: vi.fn(),
  };

  const designationsApiMock = { getDesignationOptions: vi.fn() };
  const rolesApiMock = { assignRolesToUser: vi.fn() };

  const commonMock = {
    getLoginInfo: vi.fn(),
    showMessage: vi.fn(),
    getPaginationParam: (event: TableLazyLoadEvent) => {
      const rows = event.rows ?? 10;
      return {
        page: Math.floor((event.first ?? 0) / rows) + 1,
        rows,
        sortField: event.sortField,
        sortOrder: event.sortOrder === 1 ? 'asc' : 'desc',
      };
    },
  };

  /** The request body handed to `StaffMembersApi.getAllStaffMembers` on the most recent call. */
  const lastStaffMembersRequest = (): GetAllStaffMembersReq =>
    staffMembersApiMock.getAllStaffMembers.mock.lastCall?.[0];

  beforeEach(() => {
    vi.clearAllMocks();
    commonMock.getLoginInfo.mockResolvedValue(loginInfo);
    staffMembersApiMock.getAllStaffMembers.mockReturnValue(of(emptyPage));
    staffMembersApiMock.getStaffMemberStatistics.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: null }),
    );
    staffMembersApiMock.deleteStaffMember.mockReturnValue(
      of({ isSucceeded: true, message: 'Removed.', errors: [], data: [] }),
    );
    staffMembersApiMock.updateStaffMemberUpdateStatus.mockReturnValue(
      of({ isSucceeded: true, message: 'Updated.', errors: [], data: [] }),
    );
    designationsApiMock.getDesignationOptions.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );
    rolesApiMock.assignRolesToUser.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        StaffMembersStore,
        { provide: StaffMembersApi, useValue: staffMembersApiMock },
        { provide: DesignationsApi, useValue: designationsApiMock },
        { provide: RolesApi, useValue: rolesApiMock },
        { provide: Common, useValue: commonMock },
      ],
    });
  });

  it('stays idle until the table asks for its first page', async () => {
    TestBed.inject(StaffMembersStore);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(staffMembersApiMock.getAllStaffMembers).not.toHaveBeenCalled();
  });

  it('keeps the rows and total from a successful page', async () => {
    staffMembersApiMock.getAllStaffMembers.mockReturnValue(
      of({ ...emptyPage, data: [createStaffMember({ staffMemberId: 'emp-7' })], totalRecords: 42 }),
    );

    const store = TestBed.inject(StaffMembersStore);
    await store.loadStaffMembers({ first: 0, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.staffMembers().map((row) => row.staffMemberId)).toEqual(['emp-7']);
    expect(store.totalRecords()).toBe(42);
  });

  describe('request mapping', () => {
    it('maps every applied filter onto the request', async () => {
      const store = TestBed.inject(StaffMembersStore);
      await store.loadStaffMembers({ first: 0, rows: 10 }, true, {
        staffMemberId: 'AX-002',
        staffEmploymentType: 1,
        department: 3,
        designation: 4,
      });
      await TestBed.inject(ApplicationRef).whenStable();

      expect(lastStaffMembersRequest()).toMatchObject({
        EmployementCode: 'AX-002',
        StaffEmploymentTypeId: 1,
        DepartmentId: 3,
        DesignationId: 4,
      });
    });

    it('leaves unset filters off the request', async () => {
      const store = TestBed.inject(StaffMembersStore);
      await store.loadStaffMembers({ first: 0, rows: 10 }, true, { department: 3 });
      await TestBed.inject(ApplicationRef).whenStable();

      const request = lastStaffMembersRequest();
      expect(request.DepartmentId).toBe(3);
      expect(request.EmployementCode).toBeUndefined();
      expect(request.DesignationId).toBeUndefined();
    });

    it('falls back to sorting by staffMember id, newest first', async () => {
      const store = TestBed.inject(StaffMembersStore);
      await store.loadStaffMembers({ first: 0, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();

      expect(lastStaffMembersRequest()).toMatchObject({
        SortBy: 'staffMemberId',
        SortOrder: 'desc',
        UserStaffMemberId: 'emp-1',
      });
    });

    it('keeps the current page when the change is not a page change', async () => {
      const store = TestBed.inject(StaffMembersStore);
      await store.loadStaffMembers({ first: 20, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();
      expect(lastStaffMembersRequest().PageNumber).toBe(3);

      await store.loadStaffMembers({ first: 0, rows: 10 }, false);
      await TestBed.inject(ApplicationRef).whenStable();
      expect(lastStaffMembersRequest().PageNumber).toBe(3);
    });

    it('sends an applied filter back to the first page', async () => {
      const store = TestBed.inject(StaffMembersStore);
      await store.loadStaffMembers({ first: 20, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();

      store.applyFilters({ department: 3 });
      await TestBed.inject(ApplicationRef).whenStable();

      expect(lastStaffMembersRequest()).toMatchObject({ PageNumber: 1, DepartmentId: 3 });
    });
  });

  describe('deleteStaffMember', () => {
    it('refuses to delete the signed-in user', async () => {
      const store = TestBed.inject(StaffMembersStore);
      await store.deleteStaffMember(createStaffMember({ staffMemberId: 'emp-1' }));

      expect(staffMembersApiMock.deleteStaffMember).not.toHaveBeenCalled();
      expect(commonMock.showMessage).toHaveBeenCalledWith(
        'You cannot delete your own staffMember record.',
        'error',
      );
    });

    it('refuses to delete a row with no staffMember id', async () => {
      const store = TestBed.inject(StaffMembersStore);
      await store.deleteStaffMember(createStaffMember({ staffMemberId: '' }));

      expect(staffMembersApiMock.deleteStaffMember).not.toHaveBeenCalled();
      expect(commonMock.showMessage).toHaveBeenCalledWith(
        'StaffMemberId ID is required for delete.',
        'error',
      );
    });

    it('deletes any other staffMember', async () => {
      const store = TestBed.inject(StaffMembersStore);
      await store.deleteStaffMember(createStaffMember({ staffMemberId: 'emp-2' }));

      expect(staffMembersApiMock.deleteStaffMember).toHaveBeenCalledWith({
        UserStaffMemberId: 'emp-1',
        StaffMemberId: 'emp-2',
      });
    });
  });

  /**
   * The table tracks rows by object identity, so a rebuilt row takes the open avatar popup's
   * `<ng-template>` with it. Caching a summary must therefore leave `staffMembers` untouched.
   */
  it('caches a summary without invalidating the row', async () => {
    staffMembersApiMock.getAllStaffMembers.mockReturnValue(
      of({ ...emptyPage, data: [createStaffMember()], totalRecords: 1 }),
    );

    const store = TestBed.inject(StaffMembersStore);
    await store.loadStaffMembers({ first: 0, rows: 10 });
    await TestBed.inject(ApplicationRef).whenStable();

    const before = store.staffMembers()[0];
    const summary = { staffMemberCode: 'AX-002' } as IStaffMember['summaryStaffMemberInfo'];
    store.cacheSummary('emp-2', summary);

    expect(store.staffMembers()[0]).toBe(before);
    expect(store.summaries()['emp-2']).toBe(summary);
  });

  describe('row updates', () => {
    /** The row spinner used to be a toggle, so an unpaired call left it stuck on. */
    it('clears the status spinner and flips the row on success', async () => {
      staffMembersApiMock.getAllStaffMembers.mockReturnValue(
        of({ ...emptyPage, data: [createStaffMember()], totalRecords: 1 }),
      );

      const store = TestBed.inject(StaffMembersStore);
      await store.loadStaffMembers({ first: 0, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();

      await store.toggleStaffMemberStatus(store.staffMembers()[0]);

      expect(staffMembersApiMock.updateStaffMemberUpdateStatus).toHaveBeenCalledWith({
        UserStaffMemberId: 'emp-1',
        StaffMemberId: 'emp-2',
        IsActive: false,
      });
      expect(store.staffMembers()[0].isActive).toBe(false);
      expect(store.staffMembers()[0].isUpdatingStatus).toBe(false);
    });

    it('replaces the row rather than mutating it when roles are assigned', async () => {
      staffMembersApiMock.getAllStaffMembers.mockReturnValue(
        of({ ...emptyPage, data: [createStaffMember()], totalRecords: 1 }),
      );

      const store = TestBed.inject(StaffMembersStore);
      await store.loadStaffMembers({ first: 0, rows: 10 });
      await TestBed.inject(ApplicationRef).whenStable();

      const before = store.staffMembers()[0];
      store.assignRoles(before, [
        {
          roleName: 'Manager',
          userRoleId: 0,
          roleId: 5,
          isActive: true,
          isPrimaryRole: true,
          roleType: 1,
        },
      ]);

      expect(store.staffMembers()[0]).not.toBe(before);
      expect(before.userRoles).toBeUndefined();
      expect(store.staffMembers()[0].userRoles?.map((role) => role.roleName)).toEqual(['Manager']);
    });
  });
});
