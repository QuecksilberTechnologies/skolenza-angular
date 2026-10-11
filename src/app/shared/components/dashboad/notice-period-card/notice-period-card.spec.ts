import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticePeriodCard } from './notice-period-card';

describe('NoticePeriodCard', () => {
  let fixture: ComponentFixture<NoticePeriodCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NoticePeriodCard] }).compileComponents();
    fixture = TestBed.createComponent(NoticePeriodCard);
  });

  const text = () => fixture.nativeElement.textContent as string;

  it('lists each staffMember with the days left and last working date', async () => {
    fixture.componentRef.setInput('staffMembers', [
      {
        code: 'E1',
        staffMemberName: 'Ananya Rao',
        departmentName: 'HR',
        designationName: 'Recruiter',
        expectedLastWorkingDate: '2026-11-05',
        noticeDaysRemaining: 26,
        status: 'Serving',
      },
    ]);
    await fixture.whenStable();

    expect(text()).toContain('Ananya Rao');
    expect(text()).toContain('Recruiter');
    expect(text()).toContain('26 days left');
    expect(text()).toContain('5 Nov 2026');
  });

  it('reads a missing designation as "No designation" to screen readers', async () => {
    fixture.componentRef.setInput('staffMembers', [
      {
        code: 'E2',
        staffMemberName: 'Neha Singh',
        departmentName: null,
        designationName: null,
        expectedLastWorkingDate: '2026-10-28',
        noticeDaysRemaining: 18,
        status: 'Serving',
      },
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.sr-only')?.textContent).toContain(
      'No designation',
    );
  });

  it.each([
    [8, '8 days left', false],
    [7, '7 days left', true],
    [1, '1 day left', true],
    [0, 'Last day', true],
  ])('%i days remaining reads "%s" (urgent: %s)', async (days, label, urgent) => {
    fixture.componentRef.setInput('staffMembers', [
      {
        code: 'E3',
        staffMemberName: 'Neha Singh',
        departmentName: null,
        designationName: 'HR Executive',
        expectedLastWorkingDate: '2026-10-28',
        noticeDaysRemaining: days,
        status: 'Serving',
      },
    ]);
    await fixture.whenStable();

    expect(text()).toContain(label);
    expect(!!fixture.nativeElement.querySelector('.pi-clock')).toBe(urgent);
  });

  it('shows an empty state when no one is on notice', async () => {
    fixture.componentRef.setInput('staffMembers', []);
    await fixture.whenStable();

    expect(text()).toContain('No one on notice');
  });
});
