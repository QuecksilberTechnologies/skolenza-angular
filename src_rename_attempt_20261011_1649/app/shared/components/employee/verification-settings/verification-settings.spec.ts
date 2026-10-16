import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';

import { Common, StaffMembersApi } from '@core/services';

import { VerificationSettings } from './verification-settings';
import { VerificationSettingsStore } from './verification-settings.store';

describe('VerificationSettings', () => {
  let component: VerificationSettings;
  let fixture: ComponentFixture<VerificationSettings>;
  let store: InstanceType<typeof VerificationSettingsStore>;
  const getAllPercentage = vi.fn();
  const updateBulk = vi.fn();

  const staffMembersApi = {
    getAllPercentage,
    updateBulk,
  };

  const common = {
    getLoginInfo: vi.fn().mockResolvedValue({ user: { staffMemberId: 'admin-1' } }),
    showMessage: vi.fn(),
  };
  const confirmationService = { confirm: vi.fn() };

  beforeEach(async () => {
    getAllPercentage.mockReset();
    updateBulk.mockReset();
    confirmationService.confirm.mockReset();

    await TestBed.configureTestingModule({
      imports: [VerificationSettings],
      providers: [
        MessageService,
        DatePipe,
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: StaffMembersApi, useValue: staffMembersApi },
        { provide: Common, useValue: common },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationSettings);
    component = fixture.componentInstance;
    store = fixture.debugElement.injector.get(VerificationSettingsStore);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the API data array for the verification rows', async () => {
    getAllPercentage.mockReturnValue(
      of({
        isSucceeded: true,
        message: 'StaffMember profile completion retrieved.',
        errors: [],
        data: [
          {
            sectionName: 'Overview',
            completionPercent: 71,
            isInfoVerified: true,
            isEditAllowed: false,
            isSectionCreate: true,
          },
        ],
        hasAllDocUploaded: false,
      }),
    );
    fixture.componentRef.setInput('staffMember', { staffMemberId: 'staffMember-1' });

    await component.getAllPercentage();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getAllPercentage).toHaveBeenCalledWith({ staffMemberId: 'staffMember-1' });
    expect(component.completionPercentages()).toEqual([
      expect.objectContaining({ sectionName: 'Overview', completionPercent: 71 }),
    ]);
  });

  it('drops sections that have no StaffMember Profile tab of their own', async () => {
    getAllPercentage.mockReturnValue(
      of({
        isSucceeded: true,
        message: 'StaffMember profile completion retrieved.',
        errors: [],
        data: [
          {
            sectionName: 'Overview',
            completionPercent: 71,
            isInfoVerified: true,
            isEditAllowed: false,
            isSectionCreate: true,
          },
          {
            sectionName: 'Work Locations',
            completionPercent: 100,
            isInfoVerified: true,
            isEditAllowed: false,
            isSectionCreate: true,
          },
        ],
        hasAllDocUploaded: false,
      }),
    );
    fixture.componentRef.setInput('staffMember', { staffMemberId: 'staffMember-1' });

    await component.getAllPercentage();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.completionPercentages()).toEqual([
      expect.objectContaining({ sectionName: 'Overview' }),
    ]);
  });

  it('sends only the API section DTO fields with the required tab info type', async () => {
    store.setCompletionPercentages([
      {
        sectionName: 'Overview',
        isInfoVerified: false,
        isEditAllowed: false,
        isSectionCreate: true,
      },
      {
        sectionName: 'Bank',
        isInfoVerified: false,
        isEditAllowed: true,
        isSectionCreate: true,
      },
    ]);
    updateBulk.mockReturnValue(of({ isSucceeded: true, message: 'Saved', errors: [], data: true }));
    fixture.componentRef.setInput('staffMember', { staffMemberId: 'staffMember-1' });
    fixture.detectChanges();
    await fixture.whenStable();

    component.updateSectionSetting('Overview', 'isInfoVerified', true);
    component.onSave();

    expect(updateBulk).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: [
          { tabInfoType: 1, isVerified: true, isEditAllowed: false },
          { tabInfoType: 2, isVerified: false, isEditAllowed: true },
        ],
      }),
    );
  });

  it('confirms and restores unsaved changes before closing', async () => {
    store.setCompletionPercentages([
      {
        sectionName: 'Overview',
        isInfoVerified: true,
        isEditAllowed: false,
        isSectionCreate: true,
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    component.updateSectionSetting('Overview', 'isInfoVerified', false);
    expect(component.isDirty()).toBe(true);

    const closePopup = vi.spyOn(component.closePopup, 'emit');
    component.requestClose();

    expect(confirmationService.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Discard changes?' }),
    );

    confirmationService.confirm.mock.calls[0][0].accept();

    expect(component.completionPercentages()[0].isInfoVerified).toBe(true);
    expect(component.isDirty()).toBe(false);
    expect(closePopup).toHaveBeenCalled();
  });

  it('closes immediately when no settings have changed', async () => {
    const closePopup = vi.spyOn(component.closePopup, 'emit');

    component.requestClose();

    expect(confirmationService.confirm).not.toHaveBeenCalled();
    expect(closePopup).toHaveBeenCalled();
  });
});
