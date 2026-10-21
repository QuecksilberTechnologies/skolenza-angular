import { DatePipe } from '@angular/common';
import { ApplicationRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MenuItem, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import {
  AuthApi,
  Common,
  StaffMembersApi,
  RolesApi,
  StaffProfessionalStructureApi,
} from '@core/services';
import { FeaturePageStore, LookupStore } from '@core/stores';
import { BulkImportDialogData, IStaffMember } from '@shared/interfaces';

import StaffMembers from './staff-members';

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
    nationality: 'India',
    dateOfBirth: '1995-01-01',
    dateOfOnBoarding: '2024-01-01',
    departmentId: 3,
    departmentName: 'Engineering',
    staffPositionMasterId: 4,
    positionName: 'Engineer',
    staffEmploymentTypeId: 1,
    staffEmploymentTypeName: 'Full Time',
    officialEmail: 'asha@skolenza.test',
    countryCode: 'IN',
    isActive: true,
    completionPercentage: 80,
    hasImagePicUploaded: false,
    summaryStaffMemberInfo: {} as IStaffMember['summaryStaffMemberInfo'],
    isUpdatingStatus: false,
    ...overrides,
  };
}

const adminLogin = {
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

/** Flattens the tiered action menu down to its labels. */
function menuLabels(items: MenuItem[]): string[] {
  return items.flatMap((item) => [
    ...(item.label ? [item.label] : []),
    ...menuLabels(item.items ?? []),
  ]);
}

describe('StaffMembers', () => {
  let component: StaffMembers;
  let fixture: ComponentFixture<StaffMembers>;

  const staffMembersApiMock = {
    getAllStaffMembers: vi.fn(),
    getStaffMemberStatistics: vi.fn(),
    deleteStaffMember: vi.fn(),
    updateStaffMemberUpdateStatus: vi.fn(),
    previewBulkImport: vi.fn(),
    confirmBulkImport: vi.fn(),
    getBulkImportJob: vi.fn(),
    downloadBulkImportTemplate: vi.fn(),
    downloadBulkImportReport: vi.fn(),
    sendBulkImportInvitations: vi.fn(),
  };

  const professionalStructureApiMock = { getPositions: vi.fn() };

  /** Typed wide enough for the several dialogs this page opens and the values they close with. */
  const dialogServiceMock = {
    open: vi.fn<
      (
        component: unknown,
        config: { data?: unknown },
      ) => { close: () => void; onClose: Observable<unknown> }
    >(() => ({ close: vi.fn(), onClose: of<unknown>(undefined) })),
  };

  const lookupStoreMock = {
    departmentOptions: signal([]),
    staffEmploymentTypes: signal([]),
    isLoadingStaffEmploymentTypes: signal(false),
    isLoadingDepartmentOptions: signal(false),
  };

  const commonMock = {
    getLoginInfo: vi.fn(),
    showMessage: vi.fn(),
    setPageHeaderInfo: vi.fn(),
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

  /** Only `canPerformOrUnknown` is read by the page; `granted: null` means "module not published". */
  const featurePageStoreMock = {
    canPerformOrUnknown: vi.fn((_code: string, _operation: string) => true),
    displayNameOf: vi.fn((_code: string) => undefined),
  };

  const grantOnly = (...operations: string[]) =>
    featurePageStoreMock.canPerformOrUnknown.mockImplementation((_code, operation) =>
      operations.includes(operation),
    );

  const createComponent = async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMembers],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        { provide: DialogService, useValue: dialogServiceMock },
        { provide: StaffMembersApi, useValue: staffMembersApiMock },
        { provide: StaffProfessionalStructureApi, useValue: professionalStructureApiMock },
        { provide: LookupStore, useValue: lookupStoreMock },
        { provide: Common, useValue: commonMock },
        { provide: AuthApi, useValue: { resendCredential: vi.fn() } },
        { provide: RolesApi, useValue: { assignRolesToUser: vi.fn() } },
        { provide: FeaturePageStore, useValue: featurePageStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMembers);
    component = fixture.componentInstance;
    await component.ngOnInit();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    featurePageStoreMock.canPerformOrUnknown.mockImplementation(() => true);
    commonMock.getLoginInfo.mockResolvedValue(adminLogin);
    staffMembersApiMock.getAllStaffMembers.mockReturnValue(of(emptyPage));
    staffMembersApiMock.getStaffMemberStatistics.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: null }),
    );
    professionalStructureApiMock.getPositions.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [{ id: 4, name: 'Engineer', departmentId: 3 }],
      }),
    );
  });

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  describe('canManageStaffMembers', () => {
    it('is true for an admin account', async () => {
      await createComponent();
      expect(component.canManageStaffMembers()).toBe(true);
    });

    it('is false for an staffMember account', async () => {
      commonMock.getLoginInfo.mockResolvedValue({
        user: { staffMemberId: 'emp-1', primaryRole: { roleTypeId: 2 } },
      });
      await createComponent();

      expect(component.canManageStaffMembers()).toBe(false);
    });

    /** A session without a role falls back to the most restricted view. */
    it('is false when the session carries no role', async () => {
      commonMock.getLoginInfo.mockResolvedValue({ user: { staffMemberId: 'emp-1' } });
      await createComponent();

      expect(component.canManageStaffMembers()).toBe(false);
    });
  });

  describe('action menu', () => {
    it('lists every profile section', async () => {
      await createComponent();
      component['selectedRow'].set(createStaffMember());

      expect(menuLabels(component['actionMenuItems']())).toEqual(
        expect.arrayContaining(['Overview', 'Bank', 'Education', 'Dependent']),
      );
    });

    it('offers to remove another staffMember', async () => {
      await createComponent();
      component['selectedRow'].set(createStaffMember({ staffMemberId: 'emp-2' }));

      expect(menuLabels(component['actionMenuItems']())).toContain('Remove StaffMember');
    });

    it('hides the remove action on the signed-in user own row', async () => {
      await createComponent();
      component['selectedRow'].set(createStaffMember({ staffMemberId: 'emp-1' }));

      expect(menuLabels(component['actionMenuItems']())).not.toContain('Remove StaffMember');
    });

    it('offers to reset another staffMember password', async () => {
      await createComponent();
      component['selectedRow'].set(createStaffMember({ staffMemberId: 'emp-2' }));

      expect(menuLabels(component['actionMenuItems']())).toContain('Reset Password');
    });

    /** Own password changes go through the Update Password page, not this dialog. */
    it('hides the reset action on the signed-in user own row', async () => {
      await createComponent();
      component['selectedRow'].set(createStaffMember({ staffMemberId: 'emp-1' }));

      expect(menuLabels(component['actionMenuItems']())).not.toContain('Reset Password');
    });

    it('opens the reset dialog with the selected staffMember', async () => {
      await createComponent();
      const staffMember = createStaffMember({ staffMemberId: 'emp-2' });
      component['selectedRow'].set(staffMember);

      component['actionMenuItems']().find((item) => item.label === 'Reset Password')!.command!({});

      expect(dialogServiceMock.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ header: 'Reset Password', data: { staffMember } }),
      );
    });
  });

  describe('filters', () => {
    it('loads positions for the chosen department', async () => {
      await createComponent();

      component.onDepartmentChange(3);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component.store.appliedFilters()).toEqual({ department: 3 });
      expect(professionalStructureApiMock.getPositions).toHaveBeenCalledWith(
        expect.objectContaining({ pageNumber: 1 }),
      );
      expect(component.store.positionOptions()).toEqual([
        expect.objectContaining({ id: 4, name: 'Engineer', departmentId: 3 }),
      ]);
    });

    it('keeps the department when a position is chosen', async () => {
      await createComponent();

      component.onDepartmentChange(3);
      component.onPositionChange(4);

      expect(component.store.appliedFilters()).toEqual({ department: 3, position: 4 });
    });

    it('closes the drawer and applies the advanced filters', async () => {
      await createComponent();
      component['isShowFilter'] = true;

      component.onFilterApplied({ staffMemberId: 'AX-002' });

      expect(component['isShowFilter']).toBe(false);
      expect(component.store.appliedFilters()).toEqual({ staffMemberId: 'AX-002' });
    });
  });

  describe('operation gates', () => {
    it('opens every gate when the tree publishes every operation', async () => {
      await createComponent();

      expect(component.canAdd()).toBe(true);
      expect(component.canAssignRole()).toBe(true);
      expect(component.canUseRowActions()).toBe(true);
    });

    it('closes the gates the tree withholds', async () => {
      grantOnly('View');
      await createComponent();

      expect(component.canAdd()).toBe(false);
      expect(component.canUpdate()).toBe(false);
      expect(component.canRemove()).toBe(false);
      expect(component.canResendCredentials()).toBe(false);
      expect(component.canResetPassword()).toBe(false);
      expect(component.canUseRowActions()).toBe(false);
    });

    it('keeps a row action open when only one of its operations is granted', async () => {
      grantOnly('Resend Credentials');
      await createComponent();

      expect(component.canUseRowActions()).toBe(true);
      expect(component.canUpdate()).toBe(false);
    });

    /** `Reset Password` is published by its own page, so it opens the column on its own. */
    it('keeps the row actions open when only Reset Password is granted', async () => {
      grantOnly('Reset Password');
      await createComponent();

      expect(component.canResetPassword()).toBe(true);
      expect(component.canUseRowActions()).toBe(true);
    });

    /** Permissions may only ever narrow what the role check already allows. */
    it('stays closed for an staffMember account however much the tree grants', async () => {
      commonMock.getLoginInfo.mockResolvedValue({
        user: { staffMemberId: 'emp-1', primaryRole: { roleTypeId: 2 } },
      });
      await createComponent();

      expect(component.canAdd()).toBe(false);
      expect(component.canUseRowActions()).toBe(false);
    });

    it('drops the menu items whose operations are withheld', async () => {
      grantOnly('View');
      await createComponent();
      component['selectedRow'].set(createStaffMember());

      const labels = menuLabels(component['actionMenuItems']());
      expect(labels).not.toContain('Resend Credentials');
      expect(labels).not.toContain('Reset Password');
      expect(labels).not.toContain('Remove StaffMember');
      expect(labels).toContain('View Profile');
    });
  });

  describe('openBulkImport', () => {
    /** The dialog's own tests cover the flow; these cover what this page hands it. */
    const openedData = () => dialogServiceMock.open.mock.calls[0]![1].data as BulkImportDialogData;

    it('hands the dialog the StaffMember endpoints and the StaffMembers sheet', async () => {
      await createComponent();
      component.openBulkImport();

      const { adapter, display } = openedData();
      expect(display.sheetName).toBe('StaffMembers');
      expect(display.rowSummaryField).toBe('OfficialEmail');
      expect(display.entityLabelPlural).toBe('staff members');

      adapter.preview(new FormData());
      adapter.confirm({ jobId: 'job-1' });
      adapter.sendInvitations!({ jobId: 'job-1' });
      expect(staffMembersApiMock.previewBulkImport).toHaveBeenCalled();
      expect(staffMembersApiMock.confirmBulkImport).toHaveBeenCalledWith({ jobId: 'job-1' });
      expect(staffMembersApiMock.sendBulkImportInvitations).toHaveBeenCalledWith({
        jobId: 'job-1',
      });
    });

    it('reloads the first page once an import ran', async () => {
      dialogServiceMock.open.mockReturnValueOnce({ close: vi.fn(), onClose: of(true) });
      await createComponent();
      const loadStaffMembers = vi.spyOn(component.store, 'loadStaffMembers');

      component.openBulkImport();

      expect(loadStaffMembers).toHaveBeenCalledWith({ first: 0, rows: component.store.pageSize() });
    });

    it('leaves the grid alone when the dialog is dismissed', async () => {
      dialogServiceMock.open.mockReturnValueOnce({ close: vi.fn(), onClose: of(false) });
      await createComponent();
      const loadStaffMembers = vi.spyOn(component.store, 'loadStaffMembers');

      component.openBulkImport();

      expect(loadStaffMembers).not.toHaveBeenCalled();
    });

    /** Import is an `Add` against `STAFF_DIRECTORY`, so it is behind the gate the Add button is behind. */
    it('is offered only where Add is granted', async () => {
      grantOnly('View');
      await createComponent();

      expect(component.canAdd()).toBe(false);
    });
  });

  describe('empty columns', () => {
    const loadRows = (...staffMembers: IStaffMember[]) =>
      staffMembersApiMock.getAllStaffMembers.mockReturnValue(
        of({ ...emptyPage, data: staffMembers, totalRecords: staffMembers.length }),
      );

    it('hides a column no visible row fills', async () => {
      loadRows(createStaffMember({ employementCode: '   ', completionPercentage: 0 }));
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component.showStaffMemberCode()).toBe(false);
      expect(component.showProfileCompletion()).toBe(false);
    });

    /** The column carries the Assign Role control, so hiding it would strand a fresh institution. */
    it('keeps an empty role column when this session can assign roles', async () => {
      loadRows(createStaffMember());
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();

      // No `userRoles`, no `roleName`, no summary role id — nothing resolves a name.
      expect(component.canAssignRole()).toBe(true);
      expect(component.showRole()).toBe(true);
    });

    it('hides an empty role column when this session cannot assign roles', async () => {
      loadRows(createStaffMember());
      grantOnly('View');
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component.showRole()).toBe(false);
    });

    it('keeps a column one single row fills', async () => {
      loadRows(
        createStaffMember({ staffMemberId: 'a', employementCode: '', completionPercentage: 0 }),
        createStaffMember({
          staffMemberId: 'b',
          employementCode: 'AX-009',
          completionPercentage: 64,
        }),
      );
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component.showStaffMemberCode()).toBe(true);
      expect(component.showProfileCompletion()).toBe(true);
    });

    it('renders the staffMember country as an ISO code with its flag', async () => {
      loadRows(createStaffMember({ countryCode: 'IN', nationality: 'India' }));
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();
      fixture.detectChanges();

      const countryHeader = [...fixture.nativeElement.querySelectorAll('th')].find(
        (header: HTMLElement) => header.textContent?.trim() === 'Country',
      ) as HTMLElement | undefined;
      const flag = fixture.nativeElement.querySelector(
        'img[alt="India flag"]',
      ) as HTMLImageElement | null;

      expect(component.showCountry()).toBe(true);
      expect(countryHeader).toBeTruthy();
      expect(flag?.src).toContain('flagcdn.com/16x12/in.webp');
      expect(flag?.parentElement?.textContent).toContain('IN');
    });

    /** The API masks other staffMembers' details, leaving only the caller's own row populated. */
    it('hides a column that only the own record fills', async () => {
      loadRows(
        createStaffMember({
          staffMemberId: 'emp-1',
          employementCode: 'SJ/2026/AUG/0006',
          completionPercentage: 64,
          dateOfOnBoarding: '2026-08-24',
        }),
        createStaffMember({
          staffMemberId: 'emp-9',
          employementCode: '',
          completionPercentage: 0,
          dateOfOnBoarding: '',
        }),
      );
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component.showStaffMemberCode()).toBe(false);
      expect(component.showProfileCompletion()).toBe(false);
      expect(component.showJoiningDate()).toBe(false);
    });

    it('keeps a column another staffMember fills', async () => {
      loadRows(
        createStaffMember({ staffMemberId: 'emp-1', employementCode: '', completionPercentage: 0 }),
        createStaffMember({
          staffMemberId: 'emp-9',
          employementCode: 'AX-009',
          completionPercentage: 22,
        }),
      );
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component.showStaffMemberCode()).toBe(true);
      expect(component.showProfileCompletion()).toBe(true);
    });

    /** Nothing to compare against, so masking is undetectable and the column must not vanish. */
    it('falls back to any row when the list holds only the caller', async () => {
      loadRows(
        createStaffMember({
          staffMemberId: 'emp-1',
          employementCode: 'SJ/2026/AUG/0006',
          completionPercentage: 64,
        }),
      );
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(component.showStaffMemberCode()).toBe(true);
      expect(component.showProfileCompletion()).toBe(true);
    });

    it('counts only the columns the header renders', async () => {
      loadRows(
        createStaffMember({
          employementCode: '',
          completionPercentage: 0,
          dateOfOnBoarding: '',
          countryCode: '',
          nationality: '',
        }),
      );
      grantOnly('View');
      await createComponent();
      await TestBed.inject(ApplicationRef).whenStable();

      // Name, Employment Type, Department, Position — joining date is blank on every row too.
      expect(component.columnCount()).toBe(4);
    });
  });

  describe('verification sheet', () => {
    it('opens the requested staffMember profile completion settings', async () => {
      await createComponent();
      const staffMember = createStaffMember();

      component.openVerificationSheet(staffMember, document.createElement('button'));

      expect(component.verificationStaffMember()).toBe(staffMember);
    });

    it('returns focus to the trigger when the sheet closes', async () => {
      await createComponent();
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);

      component.openVerificationSheet(createStaffMember(), trigger);
      component.finishVerificationPopupClose();

      expect(component.verificationStaffMember()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      trigger.remove();
    });
  });
});
