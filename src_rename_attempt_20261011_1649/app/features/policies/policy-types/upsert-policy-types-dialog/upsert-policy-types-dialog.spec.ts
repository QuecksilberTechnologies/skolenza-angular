import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import { UpsertPolicyTypesDialog } from './upsert-policy-types-dialog';

describe('UpsertPolicyTypesDialog', () => {
  let component: UpsertPolicyTypesDialog;
  let fixture: ComponentFixture<UpsertPolicyTypesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpsertPolicyTypesDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpsertPolicyTypesDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
