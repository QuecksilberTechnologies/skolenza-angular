import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import { TicketsStore } from '../tickets.store';
import TicketAgents from './ticket-agents';

describe('TicketAgents', () => {
  let component: TicketAgents;
  let fixture: ComponentFixture<TicketAgents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketAgents],
      providers: [
        MessageService,
        ConfirmationService,
        DatePipe,
        provideHttpClient(),
        provideHttpClientTesting(),
        TicketsStore,
        { provide: DialogService, useValue: { open: () => ({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketAgents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
