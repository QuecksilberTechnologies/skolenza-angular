import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';

import { LookupStore } from '@core/stores';

import StaffMemberContactForm from './staff-member-contact-form';

describe('StaffMemberContactForm', () => {
  let component: StaffMemberContactForm;
  let fixture: ComponentFixture<StaffMemberContactForm>;
  let lookupStore: InstanceType<typeof LookupStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberContactForm],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            snapshot: { queryParamMap: { get: () => null } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberContactForm);
    component = fixture.componentInstance;
    lookupStore = TestBed.inject(LookupStore);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('requires locality as part of the persisted contact address', () => {
    const locality = component['contactForm'].controls.localityId;
    locality.markAsTouched();

    expect(locality.hasError('required')).toBe(true);
  });

  it('resets and loads every downstream location level', () => {
    const loadStates = vi.spyOn(lookupStore, 'loadStates');
    const loadDistricts = vi.spyOn(lookupStore, 'loadDistricts');
    const loadLocalities = vi.spyOn(lookupStore, 'loadLocalities');

    component.onCountryChange({ value: 784 } as never);
    expect(loadStates).toHaveBeenCalledWith(784);
    expect(loadDistricts).toHaveBeenCalledWith(undefined);
    expect(loadLocalities).toHaveBeenCalledWith(undefined);

    component.onStateChange({ value: 2 } as never);
    expect(loadDistricts).toHaveBeenCalledWith(2);

    component.onDistrictChange({ value: 7 } as never);
    expect(loadLocalities).toHaveBeenCalledWith(7);
  });

  it('strips the dial code when the edit form is patched after it is known', () => {
    component.staffMemberContact.set({
      id: 1,
      contactNumber: '+919876543218',
      alternateNumber: '+919876543219',
    } as never);
    component.selectedDialCode.set('+91');

    component.patchForm();

    const { contactNumber, alternateNumber } = component['contactForm'].controls;
    expect(contactNumber.value).toBe('9876543218');
    expect(alternateNumber.value).toBe('9876543219');
    expect(contactNumber.hasError('pattern')).toBe(false);
  });
});
