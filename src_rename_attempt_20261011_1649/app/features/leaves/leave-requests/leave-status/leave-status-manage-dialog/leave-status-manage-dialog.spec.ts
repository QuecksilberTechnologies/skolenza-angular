import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import LeaveStatusManageDialog from './leave-status-manage-dialog';

describe('LeaveStatusManageDialog', () => {
  let component: LeaveStatusManageDialog;
  let fixture: ComponentFixture<LeaveStatusManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveStatusManageDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveStatusManageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
