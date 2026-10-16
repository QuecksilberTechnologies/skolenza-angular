import { ApplicationRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, StaffMemberIdentityApi } from '@core/services';
import { StaffMemberSensitive } from '@shared/interfaces';

import { StaffMemberIdentityForm } from './staffMember-identity-form';

const usDocuments: StaffMemberSensitive[] = [
  {
    id: 1,
    countryCode: 'US',
    countryName: 'United States',
    identityCategoryName: 'Government identity',
    identityCategoryDocumentId: 41,
    documentCode: 'SSN',
    documentName: 'Social Security Number',
    description: 'United States social security identifier',
    isMandatory: true,
    staffMemberIdentityId: null,
    effectiveTo: null,
  },
  {
    id: 2,
    countryCode: 'US',
    countryName: 'United States',
    identityCategoryName: 'Government identity',
    identityCategoryDocumentId: 42,
    documentCode: 'PASSPORT',
    documentName: 'Passport',
    description: 'Government-issued passport',
    isMandatory: false,
    staffMemberIdentityId: null,
    effectiveTo: null,
  },
];

describe('StaffMemberIdentityForm', () => {
  let fixture: ComponentFixture<StaffMemberIdentityForm>;
  const createStaffMemberSensitive = vi.fn();
  const close = vi.fn();

  beforeEach(async () => {
    createStaffMemberSensitive.mockReturnValue(
      of({ isSucceeded: true, message: 'Saved', errors: [], data: [] }),
    );

    await TestBed.configureTestingModule({
      imports: [StaffMemberIdentityForm],
      providers: [
        provideRouter([]),
        {
          provide: StaffMemberIdentityApi,
          useValue: {
            staffMemberIdentities: signal(usDocuments).asReadonly(),
            isSaving: signal(false).asReadonly(),
            setIsSaving: vi.fn(),
            createStaffMemberSensitive,
          },
        },
        {
          provide: Common,
          useValue: {
            getLoginInfo: () => Promise.resolve({ user: { staffMemberId: 'staffMember-encoded-id' } }),
            showMessage: vi.fn(),
          },
        },
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberIdentityForm);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
  });

  it('renders exactly the documents returned for the staffMember country', () => {
    const host = fixture.nativeElement as HTMLElement;
    const labels = Array.from(host.querySelectorAll('h3')).map((heading) =>
      heading.textContent?.trim(),
    );

    expect(labels).toEqual(['Social Security Number', 'Passport']);
    expect(host.textContent).not.toContain('Aadhaar');
  });

  it('requires only catalogue rows marked mandatory', () => {
    const form = fixture.componentInstance['identityForm'];

    expect(form.controls['document_41'].hasError('required')).toBe(true);
    expect(form.controls['document_42'].hasError('required')).toBe(false);
  });

  it('posts the catalogue document id and code without country hardcoding', () => {
    const form = fixture.componentInstance['identityForm'];
    form.controls['document_41'].setValue('123-45-6789');

    fixture.componentInstance.onSubmit();

    const body = createStaffMemberSensitive.mock.calls[0][0] as FormData;
    expect(body.get('Identities[0].StaffMemberId')).toBe('staffMember-encoded-id');
    expect(body.get('Identities[0].IdentityCategoryDocumentId')).toBe('41');
    expect(body.get('Identities[0].DocumnetCode')).toBe('SSN');
    expect(body.get('Identities[0].IdentityValue')).toBe('123-45-6789');
  });

  it('explains the expected format of a known document', () => {
    const component = fixture.componentInstance;
    const form = component['identityForm'];
    form.controls['document_42'].setValue('12');

    expect(form.controls['document_42'].hasError('pattern')).toBe(true);
    expect(component.validationMessage(usDocuments[1])).toBe(
      'Passport must be a letter followed by 5 to 8 letters or digits.',
    );
  });

  it('requires the number once a supporting document is picked', () => {
    const component = fixture.componentInstance;
    const control = component['identityForm'].controls['document_42'];
    const file = new File(['x'], 'passport.pdf', { type: 'application/pdf' });

    component.onSelectDocument(usDocuments[1], file);
    expect(control.hasError('required')).toBe(true);
    expect(component.validationMessage(usDocuments[1])).toBe(
      'Enter the Passport number to upload its document.',
    );

    component.onSelectDocument(usDocuments[1], null);
    expect(control.hasError('required')).toBe(false);
  });

  it('never pre-fills or posts masked values already on file', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [StaffMemberIdentityForm],
      providers: [
        provideRouter([]),
        {
          provide: StaffMemberIdentityApi,
          useValue: {
            staffMemberIdentities: signal([
              { ...usDocuments[0], identityValue: '***-**-6789' },
              usDocuments[1],
            ]).asReadonly(),
            isSaving: signal(false).asReadonly(),
            setIsSaving: vi.fn(),
            createStaffMemberSensitive,
          },
        },
        {
          provide: Common,
          useValue: {
            getLoginInfo: () => Promise.resolve({ user: { staffMemberId: 'staffMember-encoded-id' } }),
            showMessage: vi.fn(),
          },
        },
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();
    createStaffMemberSensitive.mockClear();
    const maskedFixture = TestBed.createComponent(StaffMemberIdentityForm);
    maskedFixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();

    const form = maskedFixture.componentInstance['identityForm'];
    expect(form.controls['document_41'].value).toBe('');
    expect(form.controls['document_41'].hasError('required')).toBe(false);

    form.controls['document_42'].setValue('A1234567');
    maskedFixture.componentInstance.onSubmit();

    const body = createStaffMemberSensitive.mock.calls[0][0] as FormData;
    expect(body.get('Identities[0].IdentityCategoryDocumentId')).toBe('42');
    expect(body.get('Identities[1].IdentityValue')).toBeNull();
  });

  describe('validity dates', () => {
    async function openFor(row: StaffMemberSensitive | undefined) {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [StaffMemberIdentityForm],
        providers: [
          provideRouter([]),
          {
            provide: StaffMemberIdentityApi,
            useValue: {
              staffMemberIdentities: signal(usDocuments).asReadonly(),
              isSaving: signal(false).asReadonly(),
              setIsSaving: vi.fn(),
              createStaffMemberSensitive,
            },
          },
          {
            provide: Common,
            useValue: {
              getLoginInfo: () => Promise.resolve({ user: { staffMemberId: 'staffMember-encoded-id' } }),
              showMessage: vi.fn(),
            },
          },
          { provide: DynamicDialogRef, useValue: { close } },
          { provide: DynamicDialogConfig, useValue: { data: { staffMemberSensitive: row } } },
        ],
      }).compileComponents();
      createStaffMemberSensitive.mockClear();
      const single = TestBed.createComponent(StaffMemberIdentityForm);
      single.detectChanges();
      await TestBed.inject(ApplicationRef).whenStable();
      single.detectChanges();
      return single;
    }

    const passport = { ...usDocuments[1], effectiveFrom: '2026-01-01T00:00:00' };

    it('offers dates only when the dialog edits one document', async () => {
      expect(fixture.nativeElement.querySelector('#identity-effective-from')).toBeNull();

      const single = await openFor(passport);
      expect(single.nativeElement.querySelector('#identity-effective-from')).not.toBeNull();
      expect(single.componentInstance['datesForm'].value.effectiveFrom).toEqual(
        new Date(2026, 0, 1),
      );
    });

    it('posts changed dates as yyyy-MM-dd and requires the number with them', async () => {
      const single = await openFor(passport);
      const component = single.componentInstance;
      const dates = component['datesForm'];
      const number = component['identityForm'].controls['document_42'];

      dates.markAsDirty();
      dates.controls.effectiveTo.setValue(new Date(2030, 11, 31));
      expect(number.hasError('required')).toBe(true);
      expect(component.validationMessage(passport)).toBe(
        'Enter the Passport number to save its validity dates.',
      );

      number.setValue('A1234567');
      component.onSubmit();

      const body = createStaffMemberSensitive.mock.calls[0][0] as FormData;
      expect(body.get('Identities[0].EffectiveFrom')).toBe('2026-01-01');
      expect(body.get('Identities[0].EffectiveTo')).toBe('2030-12-31');
    });

    it('rejects an end date before the start date', async () => {
      const single = await openFor(passport);
      const component = single.componentInstance;
      component['identityForm'].controls['document_42'].setValue('A1234567');
      component['datesForm'].controls.effectiveTo.setValue(new Date(2025, 0, 1));

      expect(component['datesForm'].hasError('dateRange')).toBe(true);
      component.onSubmit();
      expect(createStaffMemberSensitive).not.toHaveBeenCalled();
    });
  });
});
