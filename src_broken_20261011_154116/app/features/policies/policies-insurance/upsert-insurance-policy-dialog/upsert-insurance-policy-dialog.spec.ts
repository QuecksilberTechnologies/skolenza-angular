import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { UpsertInsurancePolicyDialog } from './upsert-insurance-policy-dialog';

describe('UpsertInsurancePolicyDialog', () => {
  let component: UpsertInsurancePolicyDialog;
  let fixture: ComponentFixture<UpsertInsurancePolicyDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpsertInsurancePolicyDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpsertInsurancePolicyDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
