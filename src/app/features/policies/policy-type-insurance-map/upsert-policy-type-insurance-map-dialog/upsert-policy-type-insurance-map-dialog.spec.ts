import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { UpsertPolicyTypeInsuranceMapDialog } from './upsert-policy-type-insurance-map-dialog';

describe('UpsertPolicyTypeInsuranceMapDialog', () => {
  let component: UpsertPolicyTypeInsuranceMapDialog;
  let fixture: ComponentFixture<UpsertPolicyTypeInsuranceMapDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpsertPolicyTypeInsuranceMapDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpsertPolicyTypeInsuranceMapDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
