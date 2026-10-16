import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthStore } from '@core/stores';

import { DashboardGreeting } from './dashboard-greeting';

describe('DashboardGreeting', () => {
  let fixture: ComponentFixture<DashboardGreeting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardGreeting],
      providers: [{ provide: AuthStore, useValue: { staffMemberFullName: signal('Asha Rao') } }],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardGreeting);
    fixture.componentRef.setInput('subtitle', 'Your day at a glance.');
  });

  afterEach(() => vi.useRealTimers());

  async function greetingAt(hour: number) {
    vi.useFakeTimers({ now: new Date(2026, 9, 10, hour), toFake: ['Date'] });
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('h2').textContent.trim() as string;
  }

  it.each([
    [3, 'Good Night'],
    [5, 'Good Morning'],
    [11, 'Good Morning'],
    [12, 'Good Afternoon'],
    [17, 'Good Evening'],
    [21, 'Good Night'],
  ])('greets by first name at %i:00', async (hour, greeting) => {
    expect(await greetingAt(hour)).toBe(`${greeting}, Asha`);
  });

  it('renders the subtitle', async () => {
    await greetingAt(9);

    expect(fixture.nativeElement.textContent).toContain('Your day at a glance.');
  });
});
