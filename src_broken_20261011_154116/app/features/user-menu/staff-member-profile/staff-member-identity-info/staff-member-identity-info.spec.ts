import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services/common';
import { StaffMemberBasicAPI } from '@core/services/staffMember-basic-api';
import { StaffMemberIdentityApi } from '@core/services/staffMember-identity-api';
import { FeaturePageStore } from '@core/stores';
import {
  DeleteStaffMemberIdentityRes,
  GetStaffMemberBasicRes,
  StaffMemberSensitive,
  GetStaffMemberSensitiveRes,
} from '@shared/interfaces';

import StaffMemberIdentityInfo from './staffMember-identity-info';

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

describe('StaffMemberIdentityInfo', () => {
  let component: StaffMemberIdentityInfo;
  let fixture: ComponentFixture<StaffMemberIdentityInfo>;
  let loginInfo: typeof fakeLoginInfo;
  let queryParams: Record<string, string>;

  beforeEach(async () => {
    loginInfo = structuredClone(fakeLoginInfo);
    queryParams = {};

    await TestBed.configureTestingModule({
      imports: [StaffMemberIdentityInfo],
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
            snapshot: { queryParamMap: { get: (key: string) => queryParams[key] ?? null } },
          },
        },
        {
          provide: Common,
          useValue: {
            getLoginInfo: () => Promise.resolve(loginInfo),
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

    fixture = TestBed.createComponent(StaffMemberIdentityInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deletes the persisted staffMember identity id and reloads the list', () => {
    const identityApi = TestBed.inject(StaffMemberIdentityApi);
    const confirmation = TestBed.inject(ConfirmationService);
    const deleteIdentity = vi
      .spyOn(identityApi, 'deleteStaffMemberIdentity')
      .mockReturnValue(
        of({ isSucceeded: true, message: 'Deleted' } as unknown as DeleteStaffMemberIdentityRes),
      );
    const reload = vi.spyOn(component, 'getStaffMemberIdentities').mockResolvedValue();
    vi.spyOn(identityApi, 'getStaffMemberIdentities').mockReturnValue(
      of({ isSucceeded: true, data: [] } as unknown as GetStaffMemberSensitiveRes),
    );
    vi.spyOn(confirmation, 'confirm').mockImplementation((options) => options.accept?.());

    component.removeIdentity({
      id: 10,
      staffMemberIdentityId: 91,
      countryCode: 'IN',
      countryName: 'India',
      identityCategoryName: 'Government',
      identityCategoryDocumentId: 2,
      documentCode: 'PAN',
      documentName: 'PAN Card',
      description: '',
      isMandatory: false,
      effectiveTo: null,
    });

    expect(deleteIdentity).toHaveBeenCalledWith({ staffMemberIdentityId: 91 });
    expect(reload).toHaveBeenCalled();
  });

  it('does not delete when the session lacks the Identity delete permission', () => {
    const identityApi = TestBed.inject(StaffMemberIdentityApi);
    const confirmation = TestBed.inject(ConfirmationService);
    vi.spyOn(TestBed.inject(FeaturePageStore), 'canPerformOrUnknown').mockReturnValue(false);
    const deleteIdentity = vi.spyOn(identityApi, 'deleteStaffMemberIdentity');
    const confirm = vi.spyOn(confirmation, 'confirm');

    const denied = TestBed.createComponent(StaffMemberIdentityInfo).componentInstance;
    denied.removeIdentity({ staffMemberIdentityId: 91 } as Parameters<
      typeof denied.removeIdentity
    >[0]);

    expect(confirm).not.toHaveBeenCalled();
    expect(deleteIdentity).not.toHaveBeenCalled();
  });

  it('sends the session country when the login payload carries one', async () => {
    const identityApi = TestBed.inject(StaffMemberIdentityApi);
    const getIdentities = vi
      .spyOn(identityApi, 'getStaffMemberIdentities')
      .mockReturnValue(of({ isSucceeded: true, data: [] } as unknown as GetStaffMemberSensitiveRes));

    await component.getStaffMemberIdentities();

    expect(getIdentities).toHaveBeenCalledWith({ CountryNationalityId: 1 });
  });

  it('sends the selected staffMember id so the API resolves that staffMember country', async () => {
    queryParams = { staffMemberId: 'DLQ7VZXK', countryId: '83' };
    const identityApi = TestBed.inject(StaffMemberIdentityApi);
    const getIdentities = vi
      .spyOn(identityApi, 'getStaffMemberIdentities')
      .mockReturnValue(of({ isSucceeded: true, data: [] } as unknown as GetStaffMemberSensitiveRes));

    await component.getStaffMemberIdentities();

    expect(getIdentities).toHaveBeenCalledWith({
      StaffMemberId: 'DLQ7VZXK',
      CountryNationalityId: 83,
    });
  });

  it('falls back to the staffMember basic info when the login payload has no country', async () => {
    loginInfo.user.countryId = undefined as unknown as number;

    const basicApi = TestBed.inject(StaffMemberBasicAPI);
    const getBasics = vi
      .spyOn(basicApi, 'getStaffMemberBasics')
      .mockReturnValue(
        of({ isSucceeded: true, data: [{ countryId: 7 }] } as unknown as GetStaffMemberBasicRes),
      );

    const identityApi = TestBed.inject(StaffMemberIdentityApi);
    const getIdentities = vi
      .spyOn(identityApi, 'getStaffMemberIdentities')
      .mockReturnValue(of({ isSucceeded: true, data: [] } as unknown as GetStaffMemberSensitiveRes));

    await component.getStaffMemberIdentities();

    expect(getBasics).toHaveBeenCalledWith({ StaffMemberId: 'test-id', UserStaffMemberId: 'test-id' });
    expect(getIdentities).toHaveBeenCalledWith({ CountryNationalityId: 7 });
  });

  describe('identityStatus', () => {
    const row = (fields: Partial<StaffMemberSensitive>) => fields as StaffMemberSensitive;

    it('maps each record state to a badge', () => {
      expect(
        component.identityStatus(row({ isVerified: true, hasIdentityUploaded: true })),
      ).toEqual({ label: 'Verified', icon: 'pi-check-circle', tone: 'success' });
      expect(component.identityStatus(row({ hasIdentityUploaded: true }))).toEqual({
        label: 'Uploaded',
        icon: 'pi-check-circle',
        tone: 'success',
      });
      expect(component.identityStatus(row({ identityValue: 'ABCDE1234F' }))).toEqual({
        label: 'Document not uploaded',
        icon: 'pi-exclamation-circle',
        tone: 'warning',
      });
      expect(component.identityStatus(row({ isMandatory: true }))).toEqual({
        label: 'Not added',
        icon: 'pi-clock',
        tone: 'warning',
      });
      expect(component.identityStatus(row({ isMandatory: false }))).toEqual({
        label: 'Not added',
        icon: 'pi-clock',
        tone: 'neutral',
      });
    });
  });

  it('lists required documents first and keeps API order within each group', () => {
    TestBed.inject(StaffMemberIdentityApi).setStaffMemberIdentities([
      { identityCategoryDocumentId: 1, isMandatory: false },
      { identityCategoryDocumentId: 2, isMandatory: true },
      { identityCategoryDocumentId: 3, isMandatory: false },
      { identityCategoryDocumentId: 4, isMandatory: true },
    ] as StaffMemberSensitive[]);

    expect(component.sortedIdentities().map((x) => x.identityCategoryDocumentId)).toEqual([
      2, 4, 1, 3,
    ]);
  });

  it('keeps the verified state after the reload that follows the toggle', async () => {
    const identityApi = TestBed.inject(StaffMemberIdentityApi);
    vi.spyOn(identityApi, 'getStaffMemberIdentities').mockReturnValue(
      of({
        isSucceeded: true,
        data: [],
        completionPercentage: 40,
      } as unknown as GetStaffMemberSensitiveRes),
    );

    component.updateVerifyStatus(true);
    await fixture.whenStable();

    expect(identityApi.getStaffMemberIdentities).toHaveBeenCalled();
    expect(component.isInfoVerified()).toBe(true);
  });

  it('reads the header edit flag from the first saved row, not a catalogue row', () => {
    TestBed.inject(StaffMemberIdentityApi).setStaffMemberIdentities([
      { identityCategoryDocumentId: 1, staffMemberIdentityId: null, isEditAllowed: null },
      { identityCategoryDocumentId: 2, staffMemberIdentityId: 91, isEditAllowed: true },
    ] as StaffMemberSensitive[]);

    expect(component.headerEditAllowed()).toBe(true);
  });
});
