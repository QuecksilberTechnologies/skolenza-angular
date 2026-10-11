import { DatePipe } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';

import { StaffMemberDependentApi } from '@core/services';
import { Common } from '@core/services/common';
import { StaffMemberDependent } from '@shared/interfaces';

import StaffMemberDependentInfo from './staff-member-dependent-info';

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

const dependent = (overrides: Partial<StaffMemberDependent>): StaffMemberDependent =>
  ({
    id: 1,
    dependentName: 'Riya Mehta',
    relation: 4,
    relationType: 'CHILDREN',
    dateOfBirth: '2022-08-10',
    isCoveredInPolicy: false,
    isMarried: false,
    remark: '',
    description: '',
    hasProofUploaded: false,
    completionPercentage: 75,
    isEditAllowed: true,
    ...overrides,
  }) as StaffMemberDependent;

const dependents = [
  dependent({}),
  dependent({
    id: 2,
    dependentName: 'Kavya Sharma',
    relation: 1,
    relationType: 'SPOUSE',
    dateOfBirth: '1995-11-16',
    isCoveredInPolicy: true,
    isMarried: true,
    remark: 'Eligible for medical benefits.',
  }),
];

describe('StaffMemberDependentInfo', () => {
  let component: StaffMemberDependentInfo;
  let fixture: ComponentFixture<StaffMemberDependentInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberDependentInfo],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        {
          provide: StaffMemberDependentApi,
          useFactory: () => {
            const api = new StaffMemberDependentApi();
            api.getStaffMemberDependents = () =>
              of({
                isSucceeded: true,
                message: '',
                errors: [],
                data: dependents,
                pageNumber: 1,
                pageSize: 10,
                totalRecords: 2,
                totalPages: 1,
                completionPercentage: 75,
              });
            return api;
          },
        },
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

    fixture = TestBed.createComponent(StaffMemberDependentInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('dependent cards', () => {
    let cards: HTMLElement[];

    beforeEach(async () => {
      await TestBed.inject(ApplicationRef).whenStable();
      fixture.detectChanges();
      cards = Array.from(fixture.nativeElement.querySelectorAll('app-profile-info-card'));
    });

    it('titles each card with the dependent name', () => {
      const titles = cards.map((card) => card.querySelector('h2')?.textContent?.trim());
      expect(titles).toEqual(['Riya Mehta', 'Kavya Sharma']);
    });

    it('shows a readable relation instead of the raw enum code', () => {
      expect(cards[0].textContent).toContain('Child');
      expect(cards[0].textContent).not.toContain('CHILDREN');
      expect(cards[1].textContent).toContain('Spouse');
      expect(cards[1].textContent).not.toContain('SPOUSE');
    });

    it('states policy coverage in words', () => {
      expect(cards[0].textContent).toContain('Not covered in policy');
      expect(cards[1].textContent).toContain('Covered in policy');
    });

    it('hides marital status for a child only', () => {
      expect(cards[0].textContent).not.toMatch(/Married|Single/);
      expect(cards[1].textContent).toMatch(/·\s*Married/);
    });

    it('leaves out remark and description when they are empty', () => {
      expect(cards[0].textContent).not.toMatch(/Remark|Description/);
      expect(cards[1].textContent).toContain('Eligible for medical benefits.');
      expect(cards[1].textContent).not.toContain('Description');
    });

    it('names the dependent in the edit and delete buttons', () => {
      const labels = Array.from(cards[0].querySelectorAll('button')).map((b) =>
        b.getAttribute('aria-label'),
      );
      expect(labels).toEqual(['Edit Riya Mehta', 'Delete Riya Mehta']);
    });
  });

  describe('ageLabel', () => {
    const today = new Date(2026, 9, 4);

    it('counts whole years', () => {
      expect(component.ageLabel('2022-08-10', today)).toBe('4 yrs');
    });

    it('does not round up before the birthday', () => {
      expect(component.ageLabel('2022-10-05', today)).toBe('3 yrs');
    });

    it('uses the singular for one year', () => {
      expect(component.ageLabel('2025-10-04', today)).toBe('1 yr');
    });

    it('labels infants', () => {
      expect(component.ageLabel('2026-03-01', today)).toBe('Under 1 yr');
    });

    it('returns nothing for a missing, invalid or future date', () => {
      expect(component.ageLabel('', today)).toBe('');
      expect(component.ageLabel('not a date', today)).toBe('');
      expect(component.ageLabel('2027-01-01', today)).toBe('');
    });
  });
});
