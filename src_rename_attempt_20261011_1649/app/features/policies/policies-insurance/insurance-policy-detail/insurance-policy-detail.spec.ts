import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsurancePolicy } from '@shared/interfaces';

import { InsurancePolicyDetail } from './insurance-policy-detail';

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
  agentOfficeNumber: '',
  staffMemberAllowed: true,
  maxSpouseAllowed: 1,
  maxChildAllowed: 0,
  parentsAllowed: true,
  inLawsAllowed: false,
  isActive: true,
  isSoftDeleted: false,
  remark: '',
  description: 'Corporate health policy',
};

describe('InsurancePolicyDetail', () => {
  let component: InsurancePolicyDetail;
  let fixture: ComponentFixture<InsurancePolicyDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InsurancePolicyDetail] }).compileComponents();

    fixture = TestBed.createComponent(InsurancePolicyDetail);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('policy', fakePolicy);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the fields the table has no column for', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('India');
    expect(text).toContain('Rajesh Verma');
    expect(text).toContain('+919876543210');
    expect(text).toContain('Corporate health policy');
  });

  it('should render a dash for blank values but keep a zero count', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    // agentOfficeNumber and remark are blank in the fixture.
    expect(text).toContain('—');
    // maxChildAllowed is 0 — a real value, not a blank.
    const maxChild = [...(fixture.nativeElement as HTMLElement).querySelectorAll('div.flex-col')]
      .find((el) => el.textContent?.includes('Max Child Allowed'))
      ?.textContent?.trim();
    expect(maxChild).toContain('0');
  });

  it('should label the dialog with the policy-scoped title id', () => {
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');

    expect(dialog?.getAttribute('aria-labelledby')).toBe('insurance-policy-detail-title-3');
    expect(fixture.nativeElement.querySelector('#insurance-policy-detail-title-3')).toBeTruthy();
  });

  it('should emit closePopup from the close button', () => {
    let closed = false;
    component.closePopup.subscribe(() => (closed = true));

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'button[aria-label="Close insurance policy details"]',
      ) as HTMLButtonElement
    ).click();

    expect(closed).toBe(true);
  });
});
