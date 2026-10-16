import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import RequestLeaveDialog from './request-leave-dialog';

describe('RequestLeaveDialog', () => {
  let component: RequestLeaveDialog;
  let fixture: ComponentFixture<RequestLeaveDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestLeaveDialog],
      providers: [
        MessageService,
        DatePipe,
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
      ],
    })
      .overrideComponent(RequestLeaveDialog, { set: { template: '<div></div>' } })
      .compileComponents();

    fixture = TestBed.createComponent(RequestLeaveDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
