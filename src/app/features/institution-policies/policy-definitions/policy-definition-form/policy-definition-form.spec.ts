import { ApplicationRef, DebugElement, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { Select } from '@openng/optimus-ui/select';
import { of } from 'rxjs';
import { Mock, vi } from 'vitest';

import {
  Common,
  DesignationsApi,
  StaffMembersApi,
  CampusApi,
  InstitutionPolicyApi,
} from '@core/services';
import { CurrencyStore, FeaturePageStore, LookupStore } from '@core/stores';
import { FormSelect } from '@shared/components/form-inputs/form-select/form-select';
import { InstitutionPolicyApplicabilityDetail, InstitutionPolicyDetail } from '@shared/interfaces';

import { POLICY_FORM_MODE_KEY } from '../../institution-policy-constants';
import PolicyDefinitionForm from './policy-definition-form';
import { policyDefinitionSchema } from './policy-definition-form.schema';

const savedRow: InstitutionPolicyApplicabilityDetail = {
  leaveTypeIds: [],
  id: 1,
  mode: 1,
  priority: 500,
  countryId: null,
  stateId: null,
  districtId: null,
  localityId: null,
  campusId: null,
  staffEmploymentTypeId: null,
  departmentId: null,
  designationId: null,
  staffMemberId: 123,
  genderId: null,
  workArrangementType: null,
  employmentStatus: null,
  minimumServiceDays: null,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
};

const detail: InstitutionPolicyDetail = {
  leaveTypes: [],
  id: 7,
  code: 'LEAVE-01',
  name: 'Annual leave',
  summary: null,
  policyTypeId: 3,
  ownerDepartmentId: null,
  defaultCurrencyCode: 'INR',
  versionId: 11,
  versionNumber: 1,
  statusId: 1,
  status: 'Draft',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  changeSummary: 'Initial version',
  rules: [],
  applicability: [savedRow],
};

const HINT = 'Targets a previously saved staffMember.';
const REMOVE_LABEL = 'Remove saved staffMember from applicability row 1';

describe('PolicyDefinitionForm', () => {
  it('requires covered leave types and per-row targeting for leave policies', () => {
    const result = policyDefinitionSchema.safeParse({
      policyTypeId: 1,
      policyCode: 'ANNUAL_LEAVE_2026',
      policyName: 'Annual Leave 2026',
      summary: '',
      ownerDepartmentId: null,
      defaultCurrencyCode: 'INR',
      effectiveFrom: new Date(2026, 0, 1),
      effectiveTo: null,
      changeSummary: 'Initial version',
      rules: [
        { policyRuleTypeId: 1, ruleName: 'Casual entitlement', settings: [], leaveTypeIds: [] },
      ],
      applicability: [],
      leaveTypeIds: [],
      requiresLeaveTypeTargets: true,
      requiresAttendanceConfiguration: false,
      attendanceConfiguration: {
        attendanceLocationScope: null,
        allowBiometric: false,
        allowMobile: false,
        allowWeb: false,
        allowManualAttendance: false,
        allowWorkFromHome: false,
        requireGeoFenceForOffice: false,
        requireGpsForRemote: false,
        allowOutsideLocationWithApproval: false,
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('leaveTypeIds');
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain(
      'rules.0.leaveTypeIds',
    );
  });

  let fixture: ComponentFixture<PolicyDefinitionForm>;
  let updatePolicy: Mock<InstitutionPolicyApi['updatePolicy']>;
  let getPolicyVersion: Mock<InstitutionPolicyApi['getPolicyVersion']>;
  let navigate: Mock<Router['navigate']>;
  /** Mutable so a test can render a second instance on another route. */
  let route: { snapshot: { paramMap: ParamMap; data: Record<string, unknown> } };

  beforeEach(async () => {
    navigate = vi.fn<Router['navigate']>().mockResolvedValue(true);
    route = {
      snapshot: {
        paramMap: convertToParamMap({ policyId: '7', versionId: '11' }),
        data: { [POLICY_FORM_MODE_KEY]: 'edit' },
      },
    };
    updatePolicy = vi
      .fn<InstitutionPolicyApi['updatePolicy']>()
      .mockReturnValue(of({ isSucceeded: true, message: 'Saved', errors: [], data: detail }));
    getPolicyVersion = vi
      .fn<InstitutionPolicyApi['getPolicyVersion']>()
      .mockReturnValue(of({ isSucceeded: true, message: 'Loaded', errors: [], data: detail }));

    await TestBed.configureTestingModule({
      imports: [PolicyDefinitionForm],
      providers: [
        MessageService,
        {
          provide: InstitutionPolicyApi,
          useValue: {
            getPolicyVersion,
            updatePolicy,
            getLookups: vi.fn().mockReturnValue(
              of({
                isSucceeded: true,
                message: '',
                errors: [],
                data: {
                  statuses: [],
                  categories: [],
                  attendanceLocationScopes: [],
                  leaveTypes: [],
                  ruleTypes: [{ id: 901, code: 'ATTENDANCE_CHANNEL', name: 'Attendance Channel' }],
                  ruleDefinitions: [
                    {
                      categoryCode: 'ATTENDANCE',
                      ruleTypeCode: 'ATTENDANCE_CHANNEL',
                      settings: [
                        {
                          code: 'channelCode',
                          name: 'Channels',
                          dataTypeCode: 'CODE',
                          isRequired: true,
                          allowMultiple: true,
                          options: [],
                          dependencies: [],
                        },
                      ],
                    },
                  ],
                },
              }),
            ),
            getPolicyTypes: vi
              .fn()
              .mockReturnValue(of({ isSucceeded: true, message: '', errors: [], data: [] })),
          } satisfies Partial<InstitutionPolicyApi>,
        },
        {
          provide: Common,
          useValue: {
            showMessage: vi.fn(),
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            getLoginInfo: vi.fn().mockResolvedValue({ user: { staffMemberId: '1' } }),
          } satisfies Partial<Common>,
        },
        {
          provide: FeaturePageStore,
          useValue: {
            moduleOperationIds: vi.fn().mockReturnValue({ ModuleId: 1, OperationId: 2 }),
            whenLoaded: vi.fn().mockResolvedValue(undefined),
            displayNameOf: vi.fn().mockReturnValue(undefined),
          } satisfies Partial<InstanceType<typeof FeaturePageStore>>,
        },
        {
          provide: CampusApi,
          useValue: {
            getCampuses: vi.fn().mockReturnValue(of({ isSucceeded: true, data: [] })),
          } satisfies Partial<CampusApi>,
        },
        {
          provide: DesignationsApi,
          useValue: {
            getDesignationOptions: vi.fn().mockReturnValue(of({ isSucceeded: true, data: [] })),
          } satisfies Partial<DesignationsApi>,
        },
        {
          provide: StaffMembersApi,
          useValue: {
            getAllStaffMembers: vi.fn().mockReturnValue(
              of({
                isSucceeded: true,
                data: [{ staffMemberId: 'enc-1', firstName: 'Asha', lastName: 'Rao' }],
              }),
            ),
          } satisfies Partial<StaffMembersApi>,
        },
        {
          provide: LookupStore,
          useValue: {
            departmentOptions: signal([]),
            isLoadingDepartmentOptions: signal(false),
            countries: signal([]),
            staffEmploymentTypes: signal([]),
            genders: signal([]),
            isLoadingGenders: signal(false),
            isLoadingCountries: signal(false),
            isLoadingStaffEmploymentTypes: signal(false),
          },
        },
        { provide: CurrencyStore, useValue: { options: signal([]), isLoading: signal(false) } },
        { provide: ActivatedRoute, useFactory: () => route },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyDefinitionForm);
    await settle();
  });

  async function settle() {
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  }

  const text = (): string => fixture.nativeElement.textContent;

  it('loads the exact draft version selected in the policy list', () => {
    expect(getPolicyVersion).toHaveBeenCalledWith(7, 11, {
      moduleId: 1,
      operationId: 2,
    });
  });

  /** A second instance on another route; the mocks are cleared so only its own calls count. */
  async function renderOn(paramMap: Record<string, string>, mode: 'create' | 'edit') {
    route.snapshot = {
      paramMap: convertToParamMap(paramMap),
      data: { [POLICY_FORM_MODE_KEY]: mode },
    };
    getPolicyVersion.mockClear();
    navigate.mockClear();
    fixture = TestBed.createComponent(PolicyDefinitionForm);
    await settle();
  }

  it('opens an empty create form without loading a version', async () => {
    await renderOn({}, 'create');

    expect(getPolicyVersion).not.toHaveBeenCalled();
    expect(fixture.componentInstance['model']().changeSummary).toBe('Initial version');
    expect(fixture.componentInstance.canDeactivate()).toBe(true);
  });

  it('sends an edit URL whose ids do not parse back to the list, never into a create', async () => {
    await renderOn({ policyId: 'abc', versionId: '11' }, 'edit');

    expect(getPolicyVersion).not.toHaveBeenCalled();
    expect(TestBed.inject(Common).showMessage).toHaveBeenCalledWith(
      'This policy link is not valid. Open the policy from the list.',
      'error',
    );
    expect(navigate).toHaveBeenCalledWith(['/app/institution-policies']);
  });

  it('counts only real edits as unsaved changes', () => {
    expect(fixture.componentInstance.canDeactivate()).toBe(true);

    fixture.componentInstance['model'].update((m) => ({ ...m, policyName: 'Renamed' }));

    expect(fixture.componentInstance.canDeactivate()).toBe(false);
  });

  it('returns to the policy list after saving, without an unsaved-changes prompt', async () => {
    await submit();

    expect(updatePolicy).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/app/institution-policies']);
    expect(fixture.componentInstance.canDeactivate()).toBe(true);
  });

  const removeButton = (): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector(`button[aria-label="${REMOVE_LABEL}"]`);

  /** The real Optimus select inside the row's staffMember field. */
  function staffMemberSelect(): Select {
    const field = fixture.debugElement
      .queryAll(By.directive(FormSelect))
      .find((de: DebugElement) => de.componentInstance.inputId() === 'appStaffMember-0')!;
    return field.query(By.directive(Select)).componentInstance;
  }

  async function submit() {
    fixture.componentInstance['model'].update((m) => ({ ...m, changeSummary: 'Edited' }));
    fixture.componentInstance.onSubmit();
    await settle();
  }

  function expectStaffMemberTarget(staffMemberId: number | null, staffMemberPublicId: string | null) {
    expect(updatePolicy).toHaveBeenCalledWith(
      7,
      11,
      expect.objectContaining({
        applicability: [expect.objectContaining({ staffMemberId, staffMemberPublicId })],
      }),
    );
  }

  it('discloses a saved staffMember and sends it back unchanged', async () => {
    expect(text()).toContain(HINT);
    expect(removeButton()).toBeTruthy();

    await submit();

    expectStaffMemberTarget(123, null);
  });

  it('targets any staffMember after a pick is cleared in the select', async () => {
    const select = staffMemberSelect();
    select.onOptionSelect(new Event('click'), { staffMemberId: 'enc-1', fullName: 'Asha Rao' });
    await settle();
    expect(text()).not.toContain(HINT);

    select.clear(new Event('click'));
    await submit();

    expectStaffMemberTarget(null, null);
  });

  it('removes the saved staffMember in one click', async () => {
    removeButton()!.click();
    await settle();

    expect(text()).not.toContain(HINT);
    expect(removeButton()).toBeNull();

    await submit();

    expectStaffMemberTarget(null, null);
  });

  it('preserves execution channels over a conflicting legacy rule when saving', async () => {
    fixture.componentInstance['model'].update((model) => ({
      ...model,
      requiresAttendanceConfiguration: true,
      attendanceConfiguration: {
        ...model.attendanceConfiguration,
        attendanceLocationScope: 1,
        allowMobile: true,
        allowWeb: false,
      },
      rules: [
        {
          policyRuleTypeId: 901,
          ruleName: 'Channels',
          leaveTypeIds: [],
          settings: [{ key: 'channelCode', value: ['WEB'] }],
        },
      ],
    }));
    await submit();
    expect(updatePolicy).toHaveBeenCalledWith(
      7,
      11,
      expect.objectContaining({
        rules: [expect.objectContaining({ ruleConfiguration: '{"channelCode":["MOBILE"]}' })],
        attendanceConfiguration: expect.objectContaining({ allowMobile: true, allowWeb: false }),
      }),
    );
  });

  it('re-renders the settings when a rule type change replaces them', async () => {
    fixture.componentInstance['model'].update((model) => ({
      ...model,
      rules: [
        {
          policyRuleTypeId: null,
          ruleName: 'Legacy',
          leaveTypeIds: [],
          settings: [{ key: 'legacy', value: 'x' }],
        },
      ],
    }));
    await settle();

    fixture.componentInstance.onRuleTypeChange(0, 901);

    await expect(settle()).resolves.toBeUndefined();
    expect(text()).not.toContain('legacy');
  });

  it('saves selected channels to both representations and blocks an empty selection', async () => {
    fixture.componentInstance['model'].update((model) => ({
      ...model,
      requiresAttendanceConfiguration: true,
      attendanceConfiguration: { ...model.attendanceConfiguration, attendanceLocationScope: 1 },
      rules: [
        {
          policyRuleTypeId: 901,
          ruleName: 'Channels',
          leaveTypeIds: [],
          settings: [{ key: 'channelCode', value: ['MOBILE'] }],
        },
      ],
    }));
    fixture.componentInstance['channelSelection'].set(['WEB', 'BIOMETRIC']);
    fixture.componentInstance.onChannelsChange();
    await submit();
    expect(updatePolicy).toHaveBeenCalledWith(
      7,
      11,
      expect.objectContaining({
        rules: [
          expect.objectContaining({ ruleConfiguration: '{"channelCode":["WEB","BIOMETRIC"]}' }),
        ],
        attendanceConfiguration: expect.objectContaining({
          allowWeb: true,
          allowBiometric: true,
          allowMobile: false,
          allowManualAttendance: false,
        }),
      }),
    );
    updatePolicy.mockClear();
    fixture.componentInstance['channelSelection'].set([]);
    fixture.componentInstance.onChannelsChange();
    await submit();
    expect(updatePolicy).not.toHaveBeenCalled();
  });
});
