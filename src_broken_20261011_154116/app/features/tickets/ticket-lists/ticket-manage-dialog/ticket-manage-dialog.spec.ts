import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';

import TicketManageDialog from './ticket-manage-dialog';

describe('TicketManageDialog', () => {
  let component: TicketManageDialog;
  let fixture: ComponentFixture<TicketManageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketManageDialog],
      providers: [
        MessageService,
        DatePipe,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DynamicDialogRef, useValue: { close: () => {}, destroy: () => {} } },
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketManageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
