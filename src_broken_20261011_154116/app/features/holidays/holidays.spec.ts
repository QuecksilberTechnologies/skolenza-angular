import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import Holidays from './holidays';

describe('Holidays', () => {
  let component: Holidays;
  let fixture: ComponentFixture<Holidays>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Holidays],
      providers: [
        MessageService,
        DatePipe,
        ConfirmationService,
        { provide: DialogService, useValue: { open: () => ({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Holidays);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
