import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingCard } from './onboarding-card';

describe('OnboardingCard', () => {
  let fixture: ComponentFixture<OnboardingCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OnboardingCard] }).compileComponents();
    fixture = TestBed.createComponent(OnboardingCard);
  });

  it('lists each new joiner with designation, department and join date', async () => {
    fixture.componentRef.setInput('staffMembers', [
      {
        staffMemberId: 'enc-1',
        staffMemberName: 'Ananya Rao',
        departmentName: 'HR',
        designationName: 'Recruiter',
        roleName: null,
        date: '2026-09-28T00:00:00',
      },
    ]);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ananya Rao');
    expect(text).toContain('Recruiter');
    expect(text).toContain('HR');
    expect(text).toContain('28 Sep 2026');
  });

  it('shows an empty state with no recent joiners', async () => {
    fixture.componentRef.setInput('staffMembers', []);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No recent onboarding');
  });
});
