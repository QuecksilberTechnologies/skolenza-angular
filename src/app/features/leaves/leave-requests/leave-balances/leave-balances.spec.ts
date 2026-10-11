import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import LeaveBalances from './leave-balances';

describe('LeaveBalances', () => {
  let component: LeaveBalances;
  let fixture: ComponentFixture<LeaveBalances>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveBalances],
      providers: [
        MessageService,
        DatePipe,
        { provide: DialogService, useValue: { open: () => ({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveBalances);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
