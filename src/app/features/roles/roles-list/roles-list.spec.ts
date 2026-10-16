import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Common, RolesApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { NO_SEARCH_TERM, SettledSearchTerm } from '@shared/interfaces';

import RolesList from './roles-list';

describe('RolesList search', () => {
  const rolesApiMock = {
    roles: signal([]),
    isLoadingRoles: signal(false),
    totalRecords: signal(0),
    roleTypes: signal([]),
    getRoles: vi.fn(),
    getRoleTypeOptions: vi.fn(),
    setRoleTypes: vi.fn(),
    setRoles: vi.fn(),
    setIsLoadingRoles: vi.fn(),
    setTotalRecords: vi.fn(),
  };

  const commonMock = {
    getLoginInfo: vi.fn(),
    getPaginationParam: (event: { first?: number; rows?: number }) => {
      const rows = event.rows ?? 10;
      return {
        page: Math.floor((event.first ?? 0) / rows) + 1,
        rows,
        sortField: undefined,
        sortOrder: 'desc',
      };
    },
    setPageHeaderInfo: vi.fn(),
    showMessage: vi.fn(),
  };

  let component: RolesList;
  let dialogClosed: Subject<unknown>;
  const dialogServiceMock = { open: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    commonMock.getLoginInfo.mockResolvedValue({ user: { staffMemberId: 'emp-guid-1' } });
    rolesApiMock.getRoles.mockReturnValue(of({ isSucceeded: true, data: [], totalRecords: 0 }));
    rolesApiMock.getRoleTypeOptions.mockReturnValue(of({ isSucceeded: true, data: [] }));
    dialogClosed = new Subject<unknown>();
    dialogServiceMock.open.mockReturnValue({ onClose: dialogClosed, close: vi.fn() });

    TestBed.configureTestingModule({
      imports: [RolesList],
      providers: [
        provideRouter([]),
        ConfirmationService,
        { provide: RolesApi, useValue: rolesApiMock },
        { provide: Common, useValue: commonMock },
        {
          provide: FeaturePageStore,
          useValue: { canPerformOrUnknown: () => true, displayNameOf: () => undefined },
        },
      ],
    });
    // The search path is the request body, not the grid; rendering it would need the whole page.
    TestBed.overrideComponent(RolesList, {
      set: { template: '', providers: [{ provide: DialogService, useValue: dialogServiceMock }] },
    });
    component = TestBed.createComponent(RolesList).componentInstance;
  });

  it('sends the term as RoleName, from page 1', async () => {
    component.pageNumber.set(3);

    component.searchRoles('admin' as SettledSearchTerm);

    await vi.waitFor(() => expect(rolesApiMock.getRoles).toHaveBeenCalledTimes(1));
    expect(rolesApiMock.getRoles).toHaveBeenCalledWith(
      expect.objectContaining({ RoleName: 'admin', PageNumber: 1 }),
    );
  });

  it('drops RoleName once the box is cleared', async () => {
    component.searchRoles('admin' as SettledSearchTerm);
    await vi.waitFor(() => expect(rolesApiMock.getRoles).toHaveBeenCalledTimes(1));

    component.searchRoles(NO_SEARCH_TERM);

    await vi.waitFor(() => expect(rolesApiMock.getRoles).toHaveBeenCalledTimes(2));
    expect(rolesApiMock.getRoles).toHaveBeenLastCalledWith(
      expect.objectContaining({ RoleName: undefined }),
    );
  });

  it('reloads canonical rows and totals on page one under existing filters after a save', async () => {
    component.pageNumber.set(3);
    component.appliedFilters.set({ status: true, roleTypeId: '2' });
    const savedRole = {
      id: 501,
      roleName: 'Teaching Staff',
      roleType: 2,
      roleTypeName: 'Staff Member',
      isActive: true,
    };
    rolesApiMock.getRoles.mockReturnValue(
      of({ isSucceeded: true, data: [savedRole], totalRecords: 21 }),
    );

    component.upsertRole();
    dialogClosed.next([savedRole]);

    await vi.waitFor(() => expect(rolesApiMock.getRoles).toHaveBeenCalledTimes(1));
    expect(rolesApiMock.getRoles).toHaveBeenCalledWith(
      expect.objectContaining({ PageNumber: 1, IsActive: true, RoleType: '2' }),
    );
    expect(rolesApiMock.setRoles).toHaveBeenLastCalledWith([savedRole]);
    expect(rolesApiMock.setTotalRecords).toHaveBeenLastCalledWith(21);
  });

  it('does not reload when the role form is cancelled', () => {
    component.upsertRole();
    dialogClosed.next(undefined);
    expect(rolesApiMock.getRoles).not.toHaveBeenCalled();
  });
});
