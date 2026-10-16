import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';

import { StaffMemberExperienceAPI } from '@core/services';
import { Common } from '@core/services/common';
import { IStaffMemberExperienceInfo } from '@shared/interfaces';

import StaffMemberExperienceInfo from './staff-member-experience-info';

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

describe('StaffMemberExperienceInfo', () => {
  let component: StaffMemberExperienceInfo;
  let fixture: ComponentFixture<StaffMemberExperienceInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberExperienceInfo],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DialogService, useValue: { open: () => ({}) } },
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

    fixture = TestBed.createComponent(StaffMemberExperienceInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('record ordering and current job', () => {
    const record = (id: number, startDate: string, endDate?: string) =>
      ({ id, startDate, endDate }) as IStaffMemberExperienceInfo;

    beforeEach(async () => {
      await fixture.whenStable();
    });

    it('sorts records by start date, newest first', () => {
      TestBed.inject(StaffMemberExperienceAPI).setStaffMemberExperienceInfo([
        record(1, '2021-11-11'),
        record(2, '2022-06-11', '2025-08-07'),
        record(3, '2019-01-01', '2021-10-01'),
      ]);

      expect(component.sortedExperiences().map((x) => x.id)).toEqual([2, 1, 3]);
    });

    it('treats only the newest record without an end date as current', () => {
      TestBed.inject(StaffMemberExperienceAPI).setStaffMemberExperienceInfo([
        record(1, '2021-11-11'),
        record(2, '2022-06-11', '2025-08-07'),
      ]);

      expect(component.currentExperienceId()).toBeNull();

      TestBed.inject(StaffMemberExperienceAPI).setStaffMemberExperienceInfo([
        record(1, '2021-11-11', '2022-05-01'),
        record(2, '2022-06-11'),
      ]);

      expect(component.currentExperienceId()).toBe(2);
    });
  });

  describe('durationLabel', () => {
    it('formats years and months', () => {
      expect(component.durationLabel('2022-06-11', '2025-08-07')).toBe('3 yrs 1 mo');
      expect(component.durationLabel('2022-06-11', '2023-06-11')).toBe('1 yr');
      expect(component.durationLabel('2022-06-11', '2022-06-20')).toBe('Less than a month');
    });

    it('returns empty for unusable dates', () => {
      expect(component.durationLabel('not-a-date', '2025-08-07')).toBe('');
      expect(component.durationLabel('2025-08-07', '2022-06-11')).toBe('');
    });
  });
});
