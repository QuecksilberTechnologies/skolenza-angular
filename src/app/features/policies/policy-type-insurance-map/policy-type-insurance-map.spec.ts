import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import { Common } from '@core/services/common';

import PolicyTypeInsuranceMap from './policy-type-insurance-map';

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
    designationId: 1,
    designationName: '',
    isPasswordChangeRequired: false,
    isOnboard: false,
    countryId: 1,
  },
};

describe('PolicyTypeInsuranceMap', () => {
  let component: PolicyTypeInsuranceMap;
  let fixture: ComponentFixture<PolicyTypeInsuranceMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyTypeInsuranceMap],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        { provide: DialogService, useValue: { open: () => ({}) } },
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

    fixture = TestBed.createComponent(PolicyTypeInsuranceMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
