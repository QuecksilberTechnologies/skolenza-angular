import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import LeaveStatus from './leave-status';

describe('LeaveStatus', () => {
  let component: LeaveStatus;
  let fixture: ComponentFixture<LeaveStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveStatus],
      providers: [
        MessageService,
        DatePipe,
        { provide: DialogService, useValue: { open: () => ({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
