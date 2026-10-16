import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckInStore } from '@core/stores';

import { AttendanceCardComponent } from './attendance-card.component';

describe('AttendanceCardComponent', () => {
  let fixture: ComponentFixture<AttendanceCardComponent>;
  const store = {
    isClockedIn: signal(false),
    isLoading: signal(false),
    hasLoadFailed: signal(false),
    punchCount: signal(0),
    workDateLabel: signal('Today'),
    hasCheckedInToday: signal(false),
    clockInTime: signal<string | null>(null),
    clockOutTime: signal<string | null>(null),
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    store.isClockedIn.set(false);
    store.isLoading.set(false);
    store.hasLoadFailed.set(false);
    store.punchCount.set(0);
    store.hasCheckedInToday.set(false);
    store.clockInTime.set(null);
    store.clockOutTime.set(null);

    await TestBed.configureTestingModule({
      imports: [AttendanceCardComponent],
      providers: [{ provide: CheckInStore, useValue: store }],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceCardComponent);
    fixture.detectChanges();
  });

  it('shows not clocked in with placeholder times before the first punch', () => {
    expect(text()).toContain('Not Clocked In');
    expect(text()).toContain('--:--');
  });

  it('shows the checked-in state and first check-in time', () => {
    store.isClockedIn.set(true);
    store.clockInTime.set('09:05');
    store.punchCount.set(1);
    store.hasCheckedInToday.set(true);
    fixture.detectChanges();

    expect(text()).toContain('Checked In');
    expect(text()).toContain('09:05');
    expect(text()).toContain('1 punch');
  });

  it('shows checked out once the staffMember has punched out', () => {
    store.hasCheckedInToday.set(true);
    store.clockInTime.set('09:05');
    store.clockOutTime.set('18:10');
    fixture.detectChanges();

    expect(text()).toContain('Checked Out');
    expect(text()).toContain('18:10');
  });

  it('says attendance could not load instead of showing not clocked in', () => {
    store.hasLoadFailed.set(true);
    fixture.detectChanges();

    expect(text()).toContain('Could not load attendance');
    expect(text()).not.toContain('Not Clocked In');
  });
});
