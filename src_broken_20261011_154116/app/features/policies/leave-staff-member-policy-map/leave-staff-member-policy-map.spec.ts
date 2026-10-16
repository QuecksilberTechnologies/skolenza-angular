import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import LeaveStaffMemberPolicyMap from './leave-staffMember-policy-map';

describe('LeaveStaffMemberPolicyMap', () => {
  let component: LeaveStaffMemberPolicyMap;
  let fixture: ComponentFixture<LeaveStaffMemberPolicyMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveStaffMemberPolicyMap],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveStaffMemberPolicyMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
