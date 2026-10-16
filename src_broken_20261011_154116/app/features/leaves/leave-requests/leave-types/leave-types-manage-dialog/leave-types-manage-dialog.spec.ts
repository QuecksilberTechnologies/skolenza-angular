import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import LeaveTypesManageDialog from './leave-types-manage-dialog';

describe('LeaveTypesManageDialog', () => {
  let component: LeaveTypesManageDialog;
  let fixture: ComponentFixture<LeaveTypesManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveTypesManageDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveTypesManageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
