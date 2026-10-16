import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { StaffMembersApi } from '@core/services';

import { AvatarPopup } from './avatar-popup';

describe('AvatarPopup', () => {
  let component: AvatarPopup;
  let fixture: ComponentFixture<AvatarPopup>;

  const staffMembersApiMock = {
    getStaffMemberSummary: vi.fn().mockReturnValue(of({ isSucceeded: true, data: null, message: '' })),
    updateStaffMemberSummary: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AvatarPopup],
      providers: [
        MessageService,
        DatePipe,
        { provide: StaffMembersApi, useValue: staffMembersApiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: {}, queryParams: {} },
            params: of({}),
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarPopup);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('staffMember', { id: 1, staffMemberFullName: 'Test User' });
    fixture.componentRef.setInput('staffMemberSummary', { staffMemberFullName: 'Test User' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
