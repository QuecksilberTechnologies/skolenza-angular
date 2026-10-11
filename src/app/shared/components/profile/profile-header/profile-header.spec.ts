import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import { Common } from '@core/services/common';

import { ProfileHeader } from './profile-header';

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

describe('ProfileHeader', () => {
  let component: ProfileHeader;
  let fixture: ComponentFixture<ProfileHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileHeader],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            snapshot: { queryParamMap: { get: () => null } },
          },
        },
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

    fixture = TestBed.createComponent(ProfileHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 1);
    fixture.componentRef.setInput('actionLabel', 'Add');
    fixture.componentRef.setInput('employementCode', 'EMP-001');
    fixture.componentRef.setInput('completionPercentage', 0);
    fixture.componentRef.setInput('tabInfoType', 1);
    fixture.componentRef.setInput('isInfoVerified', false);
    fixture.componentRef.setInput('isEditAllowed', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
