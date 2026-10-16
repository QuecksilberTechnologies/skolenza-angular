import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';

import { StaffMemberBanksAPI } from '@core/services';
import { Common } from '@core/services/common';
import { IStaffMemberBankInfo } from '@shared/interfaces';

import StaffMemberBankInfo from './staff-member-bank-info';

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

describe('StaffMemberBankInfo', () => {
  let component: StaffMemberBankInfo;
  let fixture: ComponentFixture<StaffMemberBankInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberBankInfo],
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

    fixture = TestBed.createComponent(StaffMemberBankInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  async function renderBank(bankName: string, upiId = ''): Promise<HTMLElement> {
    component.isLoading.set(false);
    TestBed.inject(StaffMemberBanksAPI).setStaffMemberBanks([
      {
        id: 1,
        bankName,
        accountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        upiId,
      } as IStaffMemberBankInfo,
    ]);
    await TestBed.inject(ApplicationRef).whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the bank logo next to a known bank name', async () => {
    const el = await renderBank('HDFC Bank');
    const logo = el.querySelector<HTMLImageElement>('app-profile-info-block img');
    expect(logo?.getAttribute('src')).toContain('cashfreelogo.cashfree.com');
    expect(logo?.getAttribute('src')).toContain('/64/hdfc.png');
    expect(el.textContent).toContain('HDFC Bank');
  });

  it('shows only the name when the bank has no logo', async () => {
    const el = await renderBank('Foo Bar Bank');
    expect(el.querySelector('app-profile-info-block img')).toBeNull();
    expect(el.textContent).toContain('Foo Bar Bank');
  });

  it('shows the UPI logo beside a masked UPI ID', async () => {
    const el = await renderBank('Foo Bar Bank', 'someone@okhdfcbank');
    const logo = el.querySelector<HTMLImageElement>('app-profile-info-block img');
    expect(logo?.getAttribute('src')).toContain('/upi/64/bhim.png');
    expect(el.textContent).not.toContain('someone@okhdfcbank');
  });
});
