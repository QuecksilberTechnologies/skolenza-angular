import { DatePipe } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import { Common } from '@core/services/common';
import { AuthStore } from '@core/stores';

import { ProfileSummary } from './profile-summary';

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

describe('ProfileSummary', () => {
  let component: ProfileSummary;
  let fixture: ComponentFixture<ProfileSummary>;

  const isHost = signal(false);
  const clockButton = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      /Check (In|Out)/.test(b.textContent ?? ''),
    );

  beforeEach(async () => {
    isHost.set(false);
    await TestBed.configureTestingModule({
      imports: [ProfileSummary],
      providers: [
        {
          provide: AuthStore,
          useValue: {
            isHost,
            isLoggedIn: signal(false),
            user: signal(null),
            updateProfileImageLink: () => {},
          },
        },
        MessageService,
        DatePipe,
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            fragment: of(null),
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

    fixture = TestBed.createComponent(ProfileSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the check-in button to an staffMember', () => {
    expect(clockButton()).toBeTruthy();
  });

  it('hides the check-in button from a host, who has no attendance', () => {
    isHost.set(true);
    fixture.detectChanges();

    expect(clockButton()).toBeUndefined();
  });
});
