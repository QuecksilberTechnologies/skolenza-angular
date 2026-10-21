import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { Observable, of, Subject, throwError } from 'rxjs';

import { Common } from '@core/services/common';
import { StaffProfessionalStructureApi } from '@core/services/staff-professional-structure-api';

import { StaffMemberManageDialog } from './staff-member-manage-dialog';

const fakeLoginInfo = {
  userType: 'InstitutionStaffMember',
  accessToken: '',
  refreshToken: '',
  accessTokenExpiresAtUtc: '',
  refreshTokenExpiresAtUtc: '',
  user: {
    staffMemberId: 'test-id',
    fullName: '',
    officialEmail: '',
    profileImageUrl: '',
    institutionId: '',
    institutionName: '',
    primaryRole: { roleId: 1, roleName: '', roleTypeId: 1, roleTypeName: '' },
    secondaryRoles: [],
    staffEmploymentTypeId: 1,
    staffEmploymentTypeName: '',
    departmentId: 1,
    departmentName: '',
    staffPositionMasterId: 1,
    positionName: '',
    isPasswordChangeRequired: false,
    isOnboard: false,
    countryId: 1,
  },
};

const baseProviders = [
  MessageService,
  DatePipe,
  { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
  { provide: DynamicDialogConfig, useValue: { data: {} } },
  { provide: ActivatedRoute, useValue: { params: of({}), queryParams: of({}) } },
  {
    provide: Common,
    useValue: {
      getLoginInfo: () => Promise.resolve(fakeLoginInfo),
      showMessage: () => {},
      setPageHeaderInfo: () => {},
      setBreadcrumbItems: () => {},
      resetBreadcrumbItems: () => {},
      getPaginationParam: () => ({ page: 1, rows: 10, sortField: '', sortOrder: 'asc' }),
      pageHeaderInfo: { subscribe: () => {} },
      breadcrumbItems: { subscribe: () => {} },
    },
  },
];

describe('StaffMemberManageDialog', () => {
  let component: StaffMemberManageDialog;
  let fixture: ComponentFixture<StaffMemberManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberManageDialog],
      providers: baseProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberManageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display staff category options by their name field', () => {
    const categorySelect = fixture.nativeElement.querySelector('#institutionStaffCategoryMasterId');

    expect(categorySelect.getAttribute('optionlabel')).toBe('name');
  });

  it('should start date of birth empty', () => {
    // The datepicker normalises an empty value to null on init.
    expect(component['staffMemberForm'].controls.dateOfBirth.value).toBeFalsy();
  });

  it('should show every error on an invalid submit and focus the first invalid field', async () => {
    await component.onCreate();
    fixture.detectChanges();

    expect(component['staffMemberForm'].controls.officialEmail.touched).toBe(true);
    expect(component['staffMemberForm'].controls.genderId.touched).toBe(true);
    expect(document.activeElement?.id).toBe('firstName');
  });

  it('should hide the job family hint when the staff category is locked', () => {
    const category = component['staffMemberForm'].controls.institutionStaffCategoryMasterId;
    expect(component.showJobFamilyHint()).toBe(true);

    category.disable();

    expect(component.showJobFamilyHint()).toBe(false);
  });
});

describe('StaffMemberManageDialog professional structure loading', () => {
  const ok = <T>(data: T) => of({ isSucceeded: true, data });
  let positions: Record<number, Subject<unknown>>;
  let mastersResponse: Observable<unknown>;

  async function create() {
    await TestBed.configureTestingModule({
      imports: [StaffMemberManageDialog],
      providers: [
        ...baseProviders,
        {
          provide: StaffProfessionalStructureApi,
          useValue: {
            getCategories: () => ok([]),
            getMasters: () => mastersResponse,
            getPositions: (_page: unknown, categoryId: number) =>
              (positions[categoryId ?? 0] ??= new Subject()),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(StaffMemberManageDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    positions = {};
    mastersResponse = ok([{ id: 7, name: 'Teaching' }]);
  });

  it('should stop loading when job families fail to load', async () => {
    mastersResponse = throwError(() => new Error('boom'));
    const component = await create();

    expect(component.isLoadingProfessionalStructure()).toBe(false);
  });

  it('should load and drop stale job families when the staff category changes', async () => {
    const component = await create();
    component.jobFamilyOptions.set([{ id: 99, name: 'Stale' } as never]);

    component.onStaffCategoryChange(1);

    expect(component.isLoadingProfessionalStructure()).toBe(true);
    expect(component.jobFamilyOptions()).toEqual([]);
  });

  it('should keep the latest staff category response when an earlier one lands last', async () => {
    const component = await create();
    component.onStaffCategoryChange(1);
    component.onStaffCategoryChange(2);

    positions[2].next({ isSucceeded: true, data: [{ id: 20, staffJobFamilyMasterId: 7 }] });
    positions[2].complete();
    positions[1].next({ isSucceeded: true, data: [{ id: 10, staffJobFamilyMasterId: 8 }] });

    expect(component.isLoadingProfessionalStructure()).toBe(false);
    expect(component.jobFamilyOptions().map((family) => family.id)).toEqual([7]);
  });
});
