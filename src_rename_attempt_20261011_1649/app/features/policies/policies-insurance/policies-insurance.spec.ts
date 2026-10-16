import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { vi } from 'vitest';

import { Common } from '@core/services/common';
import { InsurancePolicy } from '@shared/interfaces';

import PoliciesInsurance from './policies-insurance';

const fakePolicy: InsurancePolicy = {
  insurancePolicyId: 3,
  policyTypeId: 4,
  policyTypeName: 'Insurance Policy',
  insurancePolicyName: 'Star Health Comprehensive',
  insurancePolicyNumber: 'SHCP-IND-2024-00123',
  providerName: 'Star Health & Allied Insurance',
  countryId: 1,
  countryName: 'India',
  startDate: '2026-03-02T18:30:00Z',
  endDate: '2027-03-02T18:30:00Z',
  agentName: 'Rajesh Verma',
  agentContactNumber: '+919876543210',
  agentOfficeNumber: '+911145678901',
  staffMemberAllowed: true,
  maxSpouseAllowed: 1,
  maxChildAllowed: 2,
  parentsAllowed: true,
  inLawsAllowed: false,
  isActive: true,
  isSoftDeleted: false,
  remark: 'Covers hospitalization and OPD',
  description: 'Corporate health policy',
};

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

describe('PoliciesInsurance', () => {
  let component: PoliciesInsurance;
  let fixture: ComponentFixture<PoliciesInsurance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoliciesInsurance],
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

    fixture = TestBed.createComponent(PoliciesInsurance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onViewDetails should hold the policy and open the detail sheet', () => {
    expect(component['isShowDetail']()).toBe(false);

    component.onViewDetails(fakePolicy);

    expect(component['detailPolicy']()).toBe(fakePolicy);
    expect(component['isShowDetail']()).toBe(true);
  });

  it('closeDetails should close the sheet and restore focus to the trigger', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const focus = vi.spyOn(trigger, 'focus');

    component.onViewDetails(fakePolicy, trigger);
    component.closeDetails();

    expect(component['isShowDetail']()).toBe(false);
    expect(focus).toHaveBeenCalled();

    // Safe to run twice — the drawer's own close path also funnels through here.
    component.closeDetails();
    expect(focus).toHaveBeenCalledTimes(1);

    trigger.remove();
  });

  it('onDetailVisibleChange should only close on false', () => {
    component.onViewDetails(fakePolicy);

    component.onDetailVisibleChange(true);
    expect(component['isShowDetail']()).toBe(true);

    component.onDetailVisibleChange(false);
    expect(component['isShowDetail']()).toBe(false);
  });

  it('action menu should open the detail sheet for the selected row', () => {
    const [viewDetails] = component['actionMenuItems'];
    expect(viewDetails.label).toBe('View Details');

    component['selectedRow'] = fakePolicy;
    viewDetails.command?.({});

    expect(component['detailPolicy']()).toBe(fakePolicy);
    expect(component['isShowDetail']()).toBe(true);
  });
});
