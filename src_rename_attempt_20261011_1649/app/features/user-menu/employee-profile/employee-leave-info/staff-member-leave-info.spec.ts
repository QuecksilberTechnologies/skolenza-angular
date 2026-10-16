import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';

import { ILeaveTypeCard } from '@shared/interfaces';

import { LeaveStore } from '../../../leaves/leave.store';
import StaffMemberLeaveInfo from './staffMember-leave-info';

const card = (overrides: Partial<ILeaveTypeCard>): ILeaveTypeCard => ({
  id: 1,
  name: 'Planned Leave',
  description: 'Vacation, Personal Time Off',
  icon: '',
  iconBgColor: '',
  iconColor: '',
  available: 12,
  consumed: 3,
  total: 15,
  isActive: true,
  isComingSoon: false,
  showDetails: true,
  ...overrides,
});

describe('StaffMemberLeaveInfo', () => {
  let component: StaffMemberLeaveInfo;
  let fixture: ComponentFixture<StaffMemberLeaveInfo>;
  const dialogService = { open: vi.fn() };

  beforeEach(async () => {
    dialogService.open.mockReset();
    await TestBed.configureTestingModule({
      imports: [StaffMemberLeaveInfo],
      providers: [
        MessageService,
        DatePipe,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DialogService, useValue: dialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberLeaveInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setCards(cards: ILeaveTypeCard[]) {
    patchState(unprotected(TestBed.inject(LeaveStore)), {
      leaveTypeCards: cards,
      isLoadingMyLeaves: false,
    });
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a tile per leave type with balance and usage', () => {
    setCards([card({}), card({ id: 2, name: 'Sick Leave', available: 8, consumed: 1, total: 9 })]);
    const el: HTMLElement = fixture.nativeElement;

    const tiles = el.querySelectorAll('ul > li');
    expect(tiles.length).toBe(2);
    expect(tiles[0].textContent).toContain('12');
    expect(tiles[0].textContent).toContain('left of 15');
    expect(tiles[0].textContent).toContain('3 days used');
    expect(tiles[1].textContent).toContain('1 day used');

    const bar = tiles[0].querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemax')).toBe('15');
  });

  it('shows summary totals of active leave types', () => {
    setCards([card({}), card({ id: 2, available: 5, consumed: 0, total: 5 })]);
    expect(component.summary()).toEqual([
      { label: 'Available', value: 17 },
      { label: 'Used', value: 3 },
      { label: 'Total', value: 20 },
    ]);
  });

  it('warns when a leave type has no days left', () => {
    setCards([card({ available: 0, consumed: 5, total: 5 })]);
    expect(fixture.nativeElement.textContent).toContain('No days left');
  });

  it('shows a fallback when balance is missing', () => {
    setCards([card({ available: null, total: null })]);
    expect(fixture.nativeElement.textContent).toContain('Balance not configured');
  });

  it('caps usage percent and handles zero total', () => {
    expect(component.usedPercent(card({ consumed: 20, total: 15 }))).toBe(100);
    expect(component.usedPercent(card({ total: 0 }))).toBe(0);
  });

  it('opens the apply-leave dialog', () => {
    setCards([card({})]);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('p-button button');
    button.click();
    expect(dialogService.open).toHaveBeenCalledOnce();
  });
});
