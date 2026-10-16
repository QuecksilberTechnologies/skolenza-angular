import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { TicketApi } from '@tickets/ticket-api';

import { ITicket } from '../models';
import { TicketsStore } from '../tickets.store';
import TicketLists from './ticket-lists';

describe('TicketLists', () => {
  let component: TicketLists;
  let fixture: ComponentFixture<TicketLists>;

  const ticketsResponse = {
    isSucceeded: true,
    message: '',
    errors: [],
    data: [] as ITicket[],
    pageNumber: 1,
    pageSize: 20,
    totalRecords: 0,
    totalPages: 1,
  };

  const httpGet = (url: string) => of(url === 'data/tickets.json' ? ticketsResponse : []);

  const httpClientMock = {
    get: vi.fn().mockImplementation(httpGet),
  };

  const commonMock = {
    setPageHeaderInfo: vi.fn(),
    setBreadcrumbItems: vi.fn(),
    showMessage: vi.fn(),
    getLoginInfo: vi.fn().mockResolvedValue({
      user: { staffMemberId: '1', primaryRole: { roleId: '2' } },
    }),
    getPaginationParam: vi.fn().mockReturnValue({
      page: 1,
      rows: 10,
      sortField: 'updated',
      sortOrder: 'desc',
    }),
  };

  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  const dialogRefMock = {
    onClose: new Subject<unknown>(),
    close: vi.fn(),
  };

  const dialogServiceMock = {
    open: vi.fn().mockReturnValue(dialogRefMock),
  };

  const ticketApiMock = {
    getClassificationDdl: vi.fn().mockReturnValue(of({ isSucceeded: true, data: [] })),
    getClassifications: vi.fn().mockReturnValue(of({ isSucceeded: true, data: [] })),
    getHeaders: vi.fn().mockReturnValue(of({ isSucceeded: true, data: [] })),
    getTypes: vi.fn().mockReturnValue(of({ isSucceeded: true, data: [] })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    httpClientMock.get.mockImplementation(httpGet);

    await TestBed.configureTestingModule({
      imports: [TicketLists],
      providers: [
        MessageService,
        ConfirmationService,
        { provide: HttpClient, useValue: httpClientMock },
        { provide: Common, useValue: commonMock },
        { provide: Router, useValue: routerMock },
        { provide: DialogService, useValue: dialogServiceMock },
        { provide: TicketApi, useValue: ticketApiMock },
        TicketsStore,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketLists);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set page header on construction', () => {
    expect(commonMock.setPageHeaderInfo).toHaveBeenCalled();
  });

  it('should load categories and agents summary on init', async () => {
    await component.ngOnInit();
    expect(httpClientMock.get).toHaveBeenCalledWith('data/ticket-categories.json');
    expect(httpClientMock.get).toHaveBeenCalledWith('data/ticket-agents-summary.json');
  });

  it('should load tickets on lazy load', async () => {
    await component['onLazyLoad']({ first: 0, rows: 10 });
    expect(httpClientMock.get).toHaveBeenCalledWith('data/tickets.json');
  });

  it('should navigate to ticket details on onTicketClick()', () => {
    component['onTicketClick']({ id: '42' } as ITicket);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/app/tickets', '42']);
  });

  describe('upserTicket()', () => {
    it('should open the ticket manage dialog', () => {
      component['upserTicket']();
      expect(dialogServiceMock.open).toHaveBeenCalled();
    });

    it('should reload tickets when dialog closes with a result', () => {
      component['upserTicket']();
      httpClientMock.get.mockClear();
      dialogRefMock.onClose.next(true);
      expect(httpClientMock.get).toHaveBeenCalledWith('data/tickets.json');
    });

    it('should not reload tickets when dialog closes without a result', () => {
      component['upserTicket']();
      httpClientMock.get.mockClear();
      dialogRefMock.onClose.next(null);
      expect(httpClientMock.get).not.toHaveBeenCalled();
    });
  });
});
