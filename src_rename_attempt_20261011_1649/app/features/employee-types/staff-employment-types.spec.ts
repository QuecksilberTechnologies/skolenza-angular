import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { StaffEmploymentType, LoginInfo } from '@shared/interfaces';

import StaffEmploymentTypes from './staff-employment-types';
import { StaffEmploymentTypesStore } from './staff-employment-types.store';

describe('StaffEmploymentTypes', () => {
  let component: StaffEmploymentTypes;
  let fixture: ComponentFixture<StaffEmploymentTypes>;

  type Spy = ReturnType<typeof vi.fn>;
  let commonMock: {
    setPageHeaderInfo: Spy;
    getLoginInfo: Spy;
    getPaginationParam: Spy;
    showMessage: Spy;
  };
  let storeMock: {
    loadStaffEmploymentTypes: Spy;
    reloadStaffEmploymentTypes: Spy;
    reloadFirstPage: Spy;
    deleteStaffEmploymentType: Spy;
    toggleStaffEmploymentTypeStatus: Spy;
    pageSize: Spy;
    staffEmploymentTypes: Spy;
    totalRecords: Spy;
    isLoading: Spy;
  };
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let dialogServiceMock: { open: Spy };
  let onClose$: Subject<unknown>;

  const loginInfo = { user: { staffMemberId: 'emp-1' } } as unknown as LoginInfo;
  const staffEmploymentType = { id: 1, typeName: 'Contractor' } as StaffEmploymentType;

  beforeEach(async () => {
    onClose$ = new Subject<unknown>();

    commonMock = {
      setPageHeaderInfo: vi.fn(),
      getLoginInfo: vi.fn().mockResolvedValue(loginInfo),
      getPaginationParam: vi.fn(),
      showMessage: vi.fn(),
    };
    storeMock = {
      loadStaffEmploymentTypes: vi.fn(),
      reloadStaffEmploymentTypes: vi.fn(),
      reloadFirstPage: vi.fn(),
      deleteStaffEmploymentType: vi.fn(),
      toggleStaffEmploymentTypeStatus: vi.fn(),
      pageSize: vi.fn().mockReturnValue(10),
      staffEmploymentTypes: vi.fn().mockReturnValue([]),
      totalRecords: vi.fn().mockReturnValue(0),
      isLoading: vi.fn().mockReturnValue(false),
    };
    dialogServiceMock = {
      open: vi.fn().mockReturnValue({ onClose: onClose$.asObservable(), close: vi.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [StaffEmploymentTypes],
      providers: [DatePipe, MessageService, ConfirmationService],
    })
      .overrideComponent(StaffEmploymentTypes, {
        set: { providers: [{ provide: StaffEmploymentTypesStore, useValue: storeMock }] },
      })
      .overrideProvider(Common, { useValue: commonMock })
      .overrideProvider(DialogService, { useValue: dialogServiceMock })
      .compileComponents();

    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    fixture = TestBed.createComponent(StaffEmploymentTypes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set page header info on construction', () => {
    expect(commonMock.setPageHeaderInfo).toHaveBeenCalledWith(
      expect.objectContaining({ pageTitle: 'StaffMember Types', pageIcon: 'pi pi-tags' }),
    );
  });

  describe('createEditStaffEmploymentType', () => {
    it('should reload in place on a successful edit', () => {
      component.createEditStaffEmploymentType(staffEmploymentType);
      onClose$.next({ isSucceeded: true });
      expect(storeMock.reloadStaffEmploymentTypes).toHaveBeenCalled();
      expect(storeMock.reloadFirstPage).not.toHaveBeenCalled();
    });

    it('should reset to the first page on a successful add', () => {
      component.createEditStaffEmploymentType();
      onClose$.next({ isSucceeded: true });
      expect(storeMock.reloadFirstPage).toHaveBeenCalledTimes(1);
      expect(storeMock.reloadStaffEmploymentTypes).not.toHaveBeenCalled();
    });

    it('should do nothing when the dialog is dismissed', () => {
      component.createEditStaffEmploymentType(staffEmploymentType);
      onClose$.next(undefined);
      expect(storeMock.reloadStaffEmploymentTypes).not.toHaveBeenCalled();
      expect(storeMock.reloadFirstPage).not.toHaveBeenCalled();
    });
  });

  describe('openBulkImport', () => {
    it('should open the bulk import dialog', () => {
      component.openBulkImport();
      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Import StaffMember Types' }),
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

  describe('confirmDeleteStaffEmploymentType', () => {
    it('should return early when no staffMember type', () => {
      component.confirmDeleteStaffEmploymentType(undefined);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('should confirm with the type name and delete on accept', () => {
      component.confirmDeleteStaffEmploymentType(staffEmploymentType);
      const config = confirmSpy.mock.calls[0][0];
      expect(config.message).toContain('Contractor');
      config.accept!();
      expect(storeMock.deleteStaffEmploymentType).toHaveBeenCalledWith(staffEmploymentType);
    });
  });

  describe('confirmToggleStatus', () => {
    it('should toggle the status on accept', () => {
      component.confirmToggleStatus({ ...staffEmploymentType, isActive: true });
      const config = confirmSpy.mock.calls[0][0];
      expect(config.header).toBe('Deactivate this staffMember type');
      config.accept!();
      expect(storeMock.toggleStaffEmploymentTypeStatus).toHaveBeenCalled();
    });
  });
});
