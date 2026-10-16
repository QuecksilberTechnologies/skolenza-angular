import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperAdminDashboardStaffMember } from '@shared/interfaces';

import { BirthdayCard } from './birthday-card';

/** Local midnight `offset` days from today, in the API's zone-less ISO shape. */
function isoDaysFromToday(offset: number): string {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00:00`;
}

function createStaffMember(
  overrides: Partial<SuperAdminDashboardStaffMember> = {},
): SuperAdminDashboardStaffMember {
  return {
    staffMemberId: 'enc-1',
    staffMemberName: 'Priya Nair',
    departmentName: 'Engineering',
    designationName: 'Developer',
    roleName: 'StaffMember',
    date: isoDaysFromToday(3),
    ...overrides,
  };
}

describe('BirthdayCard', () => {
  let fixture: ComponentFixture<BirthdayCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BirthdayCard] }).compileComponents();
    fixture = TestBed.createComponent(BirthdayCard);
  });

  async function render(staffMembers: SuperAdminDashboardStaffMember[] | null): Promise<string> {
    fixture.componentRef.setInput('staffMembers', staffMembers);
    await fixture.whenStable();
    return fixture.nativeElement.textContent as string;
  }

  it('counts days to the next birthday', async () => {
    const text = await render([
      createStaffMember({ staffMemberId: 'a', staffMemberName: 'Today Person', date: isoDaysFromToday(0) }),
      createStaffMember({ staffMemberId: 'b', staffMemberName: 'Soon Person', date: isoDaysFromToday(3) }),
      createStaffMember({ staffMemberId: 'c', staffMemberName: 'Later Person', date: isoDaysFromToday(20) }),
    ]);

    expect(text).toContain('Today!');
    expect(text).toContain('In 3d');
    expect(text).toContain('20 days');
  });

  it('shows the department', async () => {
    expect(await render([createStaffMember()])).toContain('Engineering');
  });

  it('shows an empty state when nobody has a birthday coming up', async () => {
    expect(await render([])).toContain('No upcoming birthdays');
    expect(await render(null)).toContain('No upcoming birthdays');
  });
});
