import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InstitutionsApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { IInstitution, SettledSearchTerm } from '@shared/interfaces';

import Institutions from './institutions';
import { InstitutionsStore } from './institutions.store';

const permissionsStoreMock = { canPerform: () => true };

describe('Institutions', () => {
  let component: Institutions;
  let fixture: ComponentFixture<Institutions>;

  type Spy = ReturnType<typeof vi.fn>;
  let storeMock: {
    institutions: Spy;
    isLoading: Spy;
    sendingVerification: Spy;
    statusFilter: Spy;
    verifiedFilter: Spy;
    search: Spy;
    pageSize: Spy;
    totalRecords: Spy;
    setStatusFilter: Spy;
    setVerifiedFilter: Spy;
    setSearch: Spy;
    loadPage: Spy;
    reloadInstitutions: Spy;
    deleteInstitution: Spy;
    sendVerificationEmail: Spy;
    syncPlanEntitlements: Spy;
  };
  let institutionsApiMock: { getInstitutionDeleteDependencies: ReturnType<typeof vi.fn> };
  let navigateSpy: Spy;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  const institution = {
    id: 'TEN00001',
    companyName: 'Acme Corp',
    institutionCode: 'ACME',
    companyEmailDomain: 'acme.com',
    institutionEmail: 'admin@acme.com',
    contactPersonName: 'Jane Doe',
    contactNumber: '9999999999',
    countryId: 1,
    isVerified: true,
    isActive: true,
  } as IInstitution;

  beforeEach(async () => {
    storeMock = {
      institutions: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      sendingVerification: vi.fn().mockReturnValue(new Set<string>()),
      statusFilter: vi.fn().mockReturnValue(null),
      verifiedFilter: vi.fn().mockReturnValue(null),
      search: vi.fn().mockReturnValue(''),
      pageSize: vi.fn().mockReturnValue(10),
      totalRecords: vi.fn().mockReturnValue(0),
      setStatusFilter: vi.fn(),
      setVerifiedFilter: vi.fn(),
      setSearch: vi.fn(),
      loadPage: vi.fn(),
      reloadInstitutions: vi.fn(),
      deleteInstitution: vi.fn(),
      sendVerificationEmail: vi.fn(),
      syncPlanEntitlements: vi.fn(),
    };

    institutionsApiMock = {
      getInstitutionDeleteDependencies: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: 'ok', data: null })),
    };

    await TestBed.configureTestingModule({
      imports: [Institutions],
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        DatePipe,
        // Permission gating is covered in the store spec; grant everything here.
        { provide: CurrentUserPermissionsStore, useValue: permissionsStoreMock },
        { provide: InstitutionsApi, useValue: institutionsApiMock },
      ],
    })
      .overrideComponent(Institutions, {
        set: {
          providers: [{ provide: InstitutionsStore, useValue: storeMock }],
        },
      })
      .compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    fixture = TestBed.createComponent(Institutions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build the action menu for the selected institution', () => {
    component['selectedRow'].set(institution);
    const labels = component['actionMenuItems']()
      .map((i) => i.label)
      .filter(Boolean);
    // The institution is verified, so the email is offered as a resend.
    expect(labels).toEqual([
      'View Details',
      'Edit',
      'Sync Plan Module',
      'Resend Verification Email',
      'Device Assignment',
      'Delete',
    ]);
  });

  it('should word the verification email as a first send while the institution is unverified', () => {
    component['selectedRow'].set({ ...institution, isVerified: false });
    const labels = component['actionMenuItems']()
      .map((i) => i.label)
      .filter(Boolean);
    expect(labels).toEqual([
      'View Details',
      'Edit',
      'Sync Plan Module',
      'Send Verification Email',
      'Device Assignment',
      'Delete',
    ]);
  });

  it('should disable the verification email while one is already in flight', () => {
    storeMock.sendingVerification.mockReturnValue(new Set([institution.id]));
    component['selectedRow'].set(institution);
    const item = component['actionMenuItems']().find(
      (i) => i.label === 'Resend Verification Email',
    );
    expect(item?.disabled).toBe(true);
  });

  it('should hide the entitlement sync and device assignment while the institution is inactive', () => {
    component['selectedRow'].set({ ...institution, isActive: false });
    const labels = component['actionMenuItems']()
      .map((i) => i.label)
      .filter(Boolean);
    expect(labels).toEqual(['View Details', 'Edit', 'Resend Verification Email', 'Delete']);
  });

  it('onSyncEntitlements should hand the institution to the store', () => {
    component.onSyncEntitlements(institution);

    expect(storeMock.syncPlanEntitlements).toHaveBeenCalledWith(institution);
  });

  it('onAssignDevice should route to the institution device form with the institution pre-picked', () => {
    component.onAssignDevice(institution);

    expect(navigateSpy).toHaveBeenCalledWith(['/app/institution-devices/new'], {
      queryParams: { institutionId: 'TEN00001' },
    });
  });

  /**
   * The grid deliberately shows seven columns. Domain, Institution Email and Contact Number are in the
   * detail sheet only, because carrying all ten truncated every value on the row.
   */
  describe('grid columns', () => {
    /** The spec renders with an empty list by default, so a row has to be asked for. */
    function renderRow() {
      storeMock.institutions.mockReturnValue([institution]);
      storeMock.totalRecords.mockReturnValue(1);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('renders exactly the seven columns, so adding one is a deliberate act', () => {
      const headers = [...renderRow().querySelectorAll('thead th')].map((th) =>
        th.textContent?.trim(),
      );

      expect(headers).toEqual([
        'Institution',
        'Institution Code',
        'Contact Person',
        'Country',
        'Verified',
        'Active',
        'Actions',
      ]);
    });

    it('does not render the fields the detail sheet owns', () => {
      const text = renderRow().querySelector('tbody')?.textContent ?? '';

      expect(text).not.toContain('acme.com');
      expect(text).not.toContain('admin@acme.com');
      expect(text).not.toContain('9999999999');
    });

    it('makes the whole row open the detail sheet, by pointer and by keyboard', () => {
      const row = renderRow().querySelector('tbody tr') as HTMLElement;

      // A hover-only affordance on the company name is not enough now that four fields are
      // reachable no other way.
      expect(row.getAttribute('tabindex')).toBe('0');
      expect(row.getAttribute('aria-label')).toBe('View details for Acme Corp');

      row.click();

      expect(component['detailInstitution']()).toBe(institution);
      expect(component['isShowDetail']()).toBe(true);
    });

    it('does not open the sheet when a row action is used', () => {
      const row = renderRow().querySelector('tbody tr') as HTMLElement;
      const statusButton = row.querySelector('td:last-child button') as HTMLElement;

      statusButton.click();

      // `confirm` proves the click really landed on the button, so the assertion below is about
      // stopPropagation rather than a click that went nowhere.
      expect(confirmSpy).toHaveBeenCalled();
      // The action sits on top of a clickable row; without the guard both would fire.
      expect(component['isShowDetail']()).toBe(false);
    });
  });

  it('onViewDetails should hold the institution and open the detail sheet', () => {
    expect(component['isShowDetail']()).toBe(false);

    component.onViewDetails(institution);

    expect(component['detailInstitution']()).toBe(institution);
    expect(component['isShowDetail']()).toBe(true);
  });

  // Optimus installs a permanent hideCallback that emits contextMenuSelectionChange(null) every
  // time the context menu closes. The sheet must not be wired to a signal that clears.
  it('should keep the detail sheet populated when the context menu clears its selection', () => {
    component.onViewDetails(institution);

    component['selectedRow'].set(null);

    expect(component['detailInstitution']()).toBe(institution);
    expect(component['isShowDetail']()).toBe(true);
  });

  // Optimus appends the drawer mask to document.body and tears it down on destroy only while
  // `visible` is still true. Closing the sheet before navigating strands the mask over the edit form.
  it('onDetailEdit should route to the edit form with the sheet still open', () => {
    component.onViewDetails(institution);

    component.onDetailEdit();

    expect(component['isShowDetail']()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/app/institutions', 'TEN00001', 'edit']);
  });

  it('onDetailEdit should not route when no institution is held', () => {
    component.onDetailEdit();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('onCreate should route to the create form', () => {
    component.onCreate();
    expect(navigateSpy).toHaveBeenCalledWith(['/app/institutions/new']);
  });

  it('onEdit should route to the edit form for that institution', () => {
    component.onEdit(institution);
    expect(navigateSpy).toHaveBeenCalledWith(['/app/institutions', 'TEN00001', 'edit']);
  });

  it('onDelete should delete only once the confirmation is accepted', () => {
    component.onDelete(institution);

    expect(storeMock.deleteInstitution).not.toHaveBeenCalled();

    const config = confirmSpy.mock.calls[0][0];
    expect(config.message).toContain('Acme Corp');
    config.accept!();

    expect(storeMock.deleteInstitution).toHaveBeenCalledWith(institution);
  });

  it('onDelete should read what the delete takes with it, and say so', () => {
    institutionsApiMock.getInstitutionDeleteDependencies.mockReturnValue(
      of({ isSucceeded: true, message: 'ok', data: { staffMemberCount: 12, roles: 1 } }),
    );

    component.onDelete(institution);

    expect(institutionsApiMock.getInstitutionDeleteDependencies).toHaveBeenCalledWith('TEN00001');
    const config = confirmSpy.mock.calls[0][0];
    expect(config.message).toContain('12 staffMembers');
    expect(config.message).toContain('1 role');
  });

  it('onDelete should still confirm when the impact read fails', () => {
    institutionsApiMock.getInstitutionDeleteDependencies.mockReturnValue(
      throwError(() => new Error('no schema')),
    );

    component.onDelete(institution);

    const config = confirmSpy.mock.calls[0][0];
    expect(config.message).toContain('Acme Corp');
    config.accept!();

    expect(storeMock.deleteInstitution).toHaveBeenCalledWith(institution);
  });

  it('onVerify should send the verification email only once the confirmation is accepted', () => {
    component.onVerify(institution);

    expect(storeMock.sendVerificationEmail).not.toHaveBeenCalled();

    const config = confirmSpy.mock.calls[0][0];
    expect(config.message).toContain('Acme Corp');
    config.accept!();

    expect(storeMock.sendVerificationEmail).toHaveBeenCalledWith(institution);
  });

  it('searchInstitutions should push the term into the store, which queries the server', () => {
    component.searchInstitutions('acme' as SettledSearchTerm);
    expect(storeMock.setSearch).toHaveBeenCalledWith('acme');
  });

  it('onStatusChange should push the status into the store', () => {
    component.onStatusChange(false);
    expect(storeMock.setStatusFilter).toHaveBeenCalledWith(false);

    component.onStatusChange(null);
    expect(storeMock.setStatusFilter).toHaveBeenCalledWith(null);
  });

  it('onVerifiedChange should push the verification filter into the store', () => {
    component.onVerifiedChange(true);
    expect(storeMock.setVerifiedFilter).toHaveBeenCalledWith(true);

    component.onVerifiedChange(null);
    expect(storeMock.setVerifiedFilter).toHaveBeenCalledWith(null);
  });
});
