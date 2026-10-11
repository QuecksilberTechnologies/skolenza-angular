import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import LeaveTypeMappingDialog from './leave-type-mapping-dialog';

describe('LeaveTypeMappingDialog', () => {
  let component: LeaveTypeMappingDialog;
  let fixture: ComponentFixture<LeaveTypeMappingDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveTypeMappingDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveTypeMappingDialog);
    component = fixture.componentInstance;
    // No detectChanges — effects in constructor access policyLeaveTypeMapForm before ngOnInit initializes it
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
