import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import LeaveRequests from './leave-requests';

describe('LeaveRequests', () => {
  let component: LeaveRequests;
  let fixture: ComponentFixture<LeaveRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveRequests],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveRequests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
