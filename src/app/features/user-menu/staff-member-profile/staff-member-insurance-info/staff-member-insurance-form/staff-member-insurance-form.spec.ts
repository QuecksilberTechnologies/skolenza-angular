import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { StaffMemberInsuranceApi } from '@core/services';
import { StaffMemberInsurance, GetStaffMemberInsuranceRes } from '@shared/interfaces';

import { StaffMemberInsuranceForm } from './staff-member-insurance-form';

const enrollment: StaffMemberInsurance = {
  id: 55,
  staffMemberId: 'staffMember-1',
  policyTypeId: 2,
  policyTypeName: 'Medical',
  insurancePolicyId: 900,
  insurancePolicyName: 'Example',
  hasDependent: false,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  dependents: [],
  isInfoVerified: false,
  isEditAllowed: true,
  completionPercentage: 100,
};

describe('StaffMemberInsuranceForm', () => {
  let component: StaffMemberInsuranceForm;
  let fixture: ComponentFixture<StaffMemberInsuranceForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberInsuranceForm],
      providers: [
        MessageService,
        DatePipe,
        provideHttpClient(),
        provideHttpClientTesting(),
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

    fixture = TestBed.createComponent(StaffMemberInsuranceForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([
    ['sends the enrollment id when editing', enrollment, { staffMemberInsuranceEnrollmentId: 55 }],
    ['omits the enrollment id when creating', undefined, {}],
  ])('%s', (_name, existing, expected) => {
    const insuranceApi = TestBed.inject(StaffMemberInsuranceApi);
    const createInsurance = vi
      .spyOn(insuranceApi, 'createInsurance')
      .mockReturnValue(of({ isSucceeded: true, message: 'Saved' } as GetStaffMemberInsuranceRes));

    const form = (component as unknown as { insuranceForm: FormGroup }).insuranceForm;
    component.staffMemberInsurance.set(existing);
    form.controls['insurancePolicyId'].enable();
    form.patchValue({
      policyTypeId: 2,
      insurancePolicyId: 900,
      hasDependent: false,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    component.onSubmit();

    const body = createInsurance.mock.calls[0][0];
    expect(body).toMatchObject({ policyTypeId: 2, insurancePolicyId: 900, ...expected });
    if (!existing) expect(body).not.toHaveProperty('staffMemberInsuranceEnrollmentId');
  });
});
