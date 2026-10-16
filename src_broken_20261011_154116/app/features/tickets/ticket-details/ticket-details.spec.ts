import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common } from '@core/services';
import { TicketApi } from '@tickets/ticket-api';

import { TicketsStore } from '../tickets.store';
import TicketDetails from './ticket-details';

describe('TicketDetails', () => {
  let component: TicketDetails;
  let fixture: ComponentFixture<TicketDetails>;

  const ticketsResponse = {
    isSucceeded: true,
    message: '',
    errors: [],
    data: [
      {
        id: 'TIC-001',
        title: "Laptop won't start after update",
        department: 'Engineering',
        category: 'IT Support',
        status: 'Open',
        priority: 'High',
        requester: 'Alice Doe',
        requesterInitial: 'AD',
        assignedTo: 'Sam Smith',
        assignedToInitial: 'SS',
        updated: '10 hours ago',
        comments: 9,
        attachments: 2,
        slaStatus: 'due',
        slaLabel: 'Due in 6h',
        slaProgress: 25,
      },
    ],
    pageNumber: 1,
    pageSize: 20,
    totalRecords: 1,
    totalPages: 1,
  };

  const httpGet = (url: string) => {
    if (url === 'data/tickets.json') return of(ticketsResponse);
    if (url === 'data/ticket-detail-extras.json') return of({});
    return of([]);
  };

  const httpClientMock = {
    get: vi.fn().mockImplementation(httpGet),
  };

  const activatedRouteMock = {
    snapshot: { paramMap: { get: () => 'TIC-001' } },
  };

  const commonMock = {
    setPageHeaderInfo: vi.fn(),
    setBreadcrumbItems: vi.fn(),
    showMessage: vi.fn(),
    getLoginInfo: vi.fn().mockResolvedValue({
      user: { staffMemberId: '1', primaryRole: { roleId: '2' } },
    }),
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
      imports: [TicketDetails],
      providers: [
        MessageService,
        { provide: HttpClient, useValue: httpClientMock },
        { provide: Common, useValue: commonMock },
        { provide: TicketApi, useValue: ticketApiMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        TicketsStore,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketDetails);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set page header and breadcrumb on construction', () => {
    expect(commonMock.setPageHeaderInfo).toHaveBeenCalled();
    expect(commonMock.setBreadcrumbItems).toHaveBeenCalled();
  });

  it('should load ticket detail and agents summary on init', async () => {
    await component.ngOnInit();
    expect(httpClientMock.get).toHaveBeenCalledWith('data/tickets.json');
    expect(httpClientMock.get).toHaveBeenCalledWith('data/ticket-detail-extras.json');
    expect(httpClientMock.get).toHaveBeenCalledWith('data/ticket-agents-summary.json');
  });
});
