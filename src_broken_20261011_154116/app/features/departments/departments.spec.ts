import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { Department, LoginInfo, SettledSearchTerm } from '@shared/interfaces';

import Departments from './departments';
import { DepartmentsStore } from './departments.store';

describe('Departments', () => {
  let component: Departments;
  let fixture: ComponentFixture<Departments>;

  let commonMock: {
    setPageHeaderInfo: ReturnType<typeof vi.fn>;
    getLoginInfo: ReturnType<typeof vi.fn>;
    getPaginationParam: ReturnType<typeof vi.fn>;
    showMessage: ReturnType<typeof vi.fn>;
  };
  type Spy = ReturnType<typeof vi.fn>;
  let storeMock: {
    loadDepartments: Spy;
    reloadDepartments: Spy;
    setSearch: Spy;
    reloadFirstPage: Spy;
    deleteDepartment: Spy;
    toggleDepartmentStatus: Spy;
    pageSize: Spy;
    appliedFilters: Spy;
    departments: Spy;
    totalRecords: Spy;
    isLoading: Spy;
    appliedFilterCount: Spy;
  };
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let dialogServiceMock: { open: ReturnType<typeof vi.fn> };
  let onClose$: Subject<boolean>;

  const loginInfo = { user: { staffMemberId: 'emp-1' } } as unknown as LoginInfo;
  const department = { id: 1, departmentName: 'Engineering' } as Department;

  beforeEach(async () => {
    onClose$ = new Subject<boolean>();

    commonMock = {
      setPageHeaderInfo: vi.fn(),
      getLoginInfo: vi.fn().mockResolvedValue(loginInfo),
      getPaginationParam: vi.fn(),
      showMessage: vi.fn(),
    };
    storeMock = {
      loadDepartments: vi.fn(),
      reloadDepartments: vi.fn(),
      reloadFirstPage: vi.fn(),
      setSearch: vi.fn(),
      deleteDepartment: vi.fn(),
      toggleDepartmentStatus: vi.fn(),
      pageSize: vi.fn().mockReturnValue(10),
      appliedFilters: vi.fn().mockReturnValue(null),
      departments: vi.fn().mockReturnValue([]),
      totalRecords: vi.fn().mockReturnValue(0),
      isLoading: vi.fn().mockReturnValue(false),
      appliedFilterCount: vi.fn().mockReturnValue(0),
    };
    dialogServiceMock = {
      open: vi.fn().mockReturnValue({ onClose: onClose$.asObservable(), close: vi.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [Departments],
      providers: [DatePipe, MessageService, ConfirmationService],
    })
      .overrideComponent(Departments, {
        set: {
          providers: [{ provide: DepartmentsStore, useValue: storeMock }],
        },
      })
      .overrideProvider(Common, { useValue: commonMock })
      .overrideProvider(DialogService, { useValue: dialogServiceMock })
      .compileComponents();

    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    fixture = TestBed.createComponent(Departments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set page header info on construction', () => {
    expect(commonMock.setPageHeaderInfo).toHaveBeenCalledWith(
      expect.objectContaining({ pageTitle: 'Departments', pageIcon: 'pi pi-building' }),
    );
  });

  it('should load login info on init', async () => {
    await component.ngOnInit();
    expect(commonMock.getLoginInfo).toHaveBeenCalled();
    expect(component['loginInfo']()).toBe(loginInfo);
  });

  describe('action menu', () => {
    it('should build Edit and Delete items', () => {
      const labels = component['actionMenuItems']()
        .map((i) => i.label)
        .filter(Boolean);
      expect(labels).toEqual(['Edit', 'Delete']);
    });

    it('Edit command should open the manage dialog', () => {
      component['selectedRow'].set(department);
      component['actionMenuItems']().find((i) => i.label === 'Edit')!.command!({});
      expect(dialogServiceMock.open).toHaveBeenCalled();
    });

    it('Delete command should request confirmation', () => {
      component['selectedRow'].set(department);
      component['actionMenuItems']().find((i) => i.label === 'Delete')!.command!({});
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('status toggle should confirm, then toggle through the store', () => {
      component['confirmToggleStatus'](department);

      expect(confirmSpy).toHaveBeenCalled();
      confirmSpy.mock.calls[0][0].accept!();
      expect(storeMock.toggleDepartmentStatus).toHaveBeenCalledWith(department);
    });
  });

  describe('createEditDepartment', () => {
    it('should open with Add header when no department', () => {
      component.createEditDepartment();
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Add Department', data: { department: undefined } }),
      );
    });

    it('should open with Update header when editing', () => {
      component.createEditDepartment(department);
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Update Department', data: { department } }),
      );
    });

    it('should do nothing when dialog closes without a result', () => {
      component.createEditDepartment(department);
      onClose$.next(false);
      expect(storeMock.reloadDepartments).not.toHaveBeenCalled();
    });

    it('should reload on successful edit', () => {
      component.createEditDepartment(department);
      storeMock.loadDepartments.mockClear();
      onClose$.next(true);
      expect(storeMock.reloadDepartments).toHaveBeenCalled();
      expect(storeMock.loadDepartments).not.toHaveBeenCalled();
    });

    /** Patch-then-reload used to fire two requests whenever the grid was past page 1. */
    it('should reset to first page on successful add with a single request', () => {
      component.createEditDepartment();
      // The grid's own init lazy load already called `loadDepartments` once.
      storeMock.loadDepartments.mockClear();
      onClose$.next(true);
      expect(storeMock.reloadFirstPage).toHaveBeenCalledTimes(1);
      expect(storeMock.loadDepartments).not.toHaveBeenCalled();
      expect(storeMock.reloadDepartments).not.toHaveBeenCalled();
    });
  });

  describe('openBulkImport', () => {
    it('should open the bulk import dialog', () => {
      component.openBulkImport();
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Import Departments' }),
      );
    });

    it('should do nothing when the dialog closes without an import', () => {
      component.openBulkImport();
      onClose$.next(false);
      expect(storeMock.reloadFirstPage).not.toHaveBeenCalled();
    });

    it('should reload the first page once an import ran', () => {
      component.openBulkImport();
      onClose$.next(true);
      expect(storeMock.reloadFirstPage).toHaveBeenCalled();
    });
  });

  describe('confirmDeleteDepartment', () => {
    it('should return early when no department', () => {
      component.confirmDeleteDepartment(undefined);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('should confirm with the department name and delete on accept', () => {
      component.confirmDeleteDepartment(department);
      const config = confirmSpy.mock.calls[0][0];
      expect(config.message).toContain('Engineering');
      config.accept!();
      expect(storeMock.deleteDepartment).toHaveBeenCalledWith(department);
    });
  });

  it('searchDepartments should send the term to the store from page 1', () => {
    component['table']()!.first = 20;

    component.searchDepartments('eng' as SettledSearchTerm);

    expect(storeMock.setSearch).toHaveBeenCalledWith('eng');
    expect(component['table']()!.first).toBe(0);
  });

  it('openFilterDrawer should reveal the filter panel', () => {
    component.openFilterDrawer();
    expect(component['isFilterDrawerOpen']()).toBe(true);
  });

  it('onStatusChange should merge status into applied filters and reload', () => {
    storeMock.appliedFilters.mockReturnValue({ search: 'x' });
    component.onStatusChange(false);
    expect(storeMock.loadDepartments).toHaveBeenCalledWith(
      { first: 0, rows: 10 },
      { search: 'x', status: false },
    );
  });
});
