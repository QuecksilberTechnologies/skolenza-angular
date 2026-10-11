import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Common } from '@core/services/common';
import { MessageService } from '@openng/optimus-ui/api';

import AppsPopupComponent from './apps-popup';

const fakeLoginInfo = {
  success: true,
  token: '',
  refreshToken: '',
  message: '',
  allroles: '',
  commonItems: [],
  operationalMenus: [],
  staffMemberInfo: {
    staffMemberId: 'test-id',
    roleTypeId: 1,
    roleTypeName: '',
    institutionName: '',
    designationId: 1,
    designationName: '',
    departmentId: 1,
    departmentName: '',
    staffEmploymentTypeId: 1,
    officialEmail: '',
    staffMemberFullName: '',
    userPrimaryRole: { roleName: '', roleId: 1, isActive: true, isPrimaryRole: true },
    userSecondryRoles: [],
    profileImageLink: '',
    isPasswordChangeRequired: false,
    countryId: 1,
    nationality: '',
  },
};

describe('AppsPopupComponent', () => {
  let component: AppsPopupComponent;
  let fixture: ComponentFixture<AppsPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppsPopupComponent],
      providers: [
        MessageService,
        DatePipe,
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

    fixture = TestBed.createComponent(AppsPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
