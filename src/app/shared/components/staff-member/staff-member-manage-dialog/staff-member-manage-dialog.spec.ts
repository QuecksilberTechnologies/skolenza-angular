import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';

import { Common } from '@core/services/common';

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

describe('StaffMemberManageDialog', () => {
  let component: StaffMemberManageDialog;
  let fixture: ComponentFixture<StaffMemberManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberManageDialog],
      providers: [
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
      ],
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
