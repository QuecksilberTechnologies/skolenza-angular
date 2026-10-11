import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import PolicyTypes from './policy-types';

describe('PolicyTypes', () => {
  let component: PolicyTypes;
  let fixture: ComponentFixture<PolicyTypes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyTypes],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        { provide: DialogService, useValue: { open: () => ({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyTypes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
