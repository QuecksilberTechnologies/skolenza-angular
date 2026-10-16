import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services/common';
import { StaffMemberInsuranceApi } from '@core/services/staff-member-insurance-api';
import { FeaturePageStore } from '@core/stores';
import { StaffMemberInsurance, GetStaffMemberInsuranceRes } from '@shared/interfaces';

import StaffMemberInsuranceInfo from './staff-member-insurance-info';

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

describe('StaffMemberInsuranceInfo', () => {
  let component: StaffMemberInsuranceInfo;
  let fixture: ComponentFixture<StaffMemberInsuranceInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberInsuranceInfo],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
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

    fixture = TestBed.createComponent(StaffMemberInsuranceInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not ask to delete when the session lacks the Insurance delete permission', () => {
    vi.spyOn(TestBed.inject(FeaturePageStore), 'canPerformOrUnknown').mockReturnValue(false);
    const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    const denied = TestBed.createComponent(StaffMemberInsuranceInfo).componentInstance;
    denied.removeInsurance({ id: 55 } as StaffMemberInsurance);

    expect(confirm).not.toHaveBeenCalled();
  });

  it('single delete sends the enrollment id without selecting delete-all', () => {
    const insuranceApi = TestBed.inject(StaffMemberInsuranceApi);
    const deleteInsurance = vi
      .spyOn(insuranceApi, 'deleteInsurance')
      .mockReturnValue(
        of({ isSucceeded: true, message: 'Deleted' } as unknown as GetStaffMemberInsuranceRes),
      );
    vi.spyOn(component, 'getEnrolledInsurances').mockResolvedValue();

    component.deleteInsuranceProcess({
      id: 55,
      staffMemberId: 'staffMember-1',
      policyTypeId: 2,
      policyTypeName: 'Medical',
      insurancePolicyId: 900,
      insurancePolicyName: 'Example',
      hasDependent: false,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      dependents: [],
      isInfoVerified: false,
      isEditAllowed: true,
      completionPercentage: 100,
    } satisfies StaffMemberInsurance);

    expect(deleteInsurance).toHaveBeenCalledWith({ staffMemberInsuranceMappingId: 55 });
  });
});
