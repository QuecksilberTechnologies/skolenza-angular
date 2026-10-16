import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { StaffMembersApi } from '@core/services';
import { IStaffMember, SummaryStaffMemberInfo } from '@shared/interfaces';

import { AvatarPopup } from './avatar-popup';

describe('AvatarPopup', () => {
  let component: AvatarPopup;
  let fixture: ComponentFixture<AvatarPopup>;

  const staffMembersApiMock = {
    getStaffMemberSummary: vi
      .fn()
      .mockReturnValue(of({ isSucceeded: true, data: null, message: '' })),
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
    fixture.componentRef.setInput('staffMember', {
      staffMemberId: 'staff-1',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      positionName: 'Mathematics Teacher',
    } as unknown as IStaffMember);
    fixture.componentRef.setInput('staffMemberSummary', {
      positionName: 'Teacher',
      department: 'Academics',
      staffEmploymentTypeName: 'Permanent',
    } as SummaryStaffMemberInfo);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the current Position instead of the legacy Designation', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Position');
    expect(text).toContain('Mathematics Teacher');
    expect(text).not.toContain('Historical designation');
  });

  it('uses the canonical Position returned by the profile summary', () => {
    fixture.componentRef.setInput('staffMember', {
      staffMemberId: 'staff-1',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    } as unknown as IStaffMember);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Position');
    expect(text).not.toContain('Historical designation');
    expect(text).toContain('Teacher');
  });
});
