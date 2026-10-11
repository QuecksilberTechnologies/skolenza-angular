import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { WidgetListCard } from './widget-list-card';

describe('WidgetListCard', () => {
  let fixture: ComponentFixture<WidgetListCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WidgetListCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(WidgetListCard);
  });

  const text = () => fixture.nativeElement.textContent as string;

  it('lists each row with subtitle, status and date', async () => {
    fixture.componentRef.setInput('section', {
      data: [
        {
          code: 'T1',
          title: 'Fix login',
          subtitle: 'Sprint 4',
          status: 'Open',
          date: '2026-10-12',
        },
      ],
      source: null,
      isPlaceholder: false,
      placeholderFields: null,
    });
    await fixture.whenStable();

    expect(text()).toContain('Fix login');
    expect(text()).toContain('Sprint 4');
    expect(text()).toContain('Open');
    expect(text()).toContain('12 Oct 2026');
    expect(text()).not.toContain('Sample data');
  });

  it('formats a start/end date range and tidies the status label', async () => {
    fixture.componentRef.setInput('section', {
      data: [
        {
          code: 'L1',
          title: 'Aarav Sharma',
          subtitle: null,
          status: 'NOTICE_PERIOD',
          date: '2026-10-12/2026-10-13',
        },
      ],
      source: null,
      isPlaceholder: false,
      placeholderFields: null,
    });
    await fixture.whenStable();

    expect(text()).toContain('12–13 Oct 2026');
    expect(text()).toContain('Notice period');
  });

  it.each([
    ['2026-10-28/2026-11-03', '28 Oct – 3 Nov 2026'],
    ['2026-12-30/2027-01-02', '30 Dec 2026 – 2 Jan 2027'],
    ['2026-10-12/2026-10-12', '12 Oct 2026'],
    ['bad/2026-10-12', 'bad/2026-10-12'],
  ])('formats the range %s as %s', async (date, expected) => {
    fixture.componentRef.setInput('section', {
      data: [{ code: 'L1', title: 'Aarav Sharma', subtitle: null, status: 'APPROVED', date }],
      source: null,
      isPlaceholder: false,
      placeholderFields: null,
    });
    await fixture.whenStable();

    expect(text()).toContain(expected);
  });

  it('paints a name-seeded avatar instead of a brand tint', async () => {
    fixture.componentRef.setInput('showAvatar', true);
    fixture.componentRef.setInput('section', {
      data: [{ code: 'B1', title: 'Meera Patel', subtitle: null, status: null, date: null }],
      source: null,
      isPlaceholder: false,
      placeholderFields: null,
    });
    await fixture.whenStable();

    const avatar = fixture.nativeElement.querySelector('[aria-hidden="true"].rounded-full');
    expect(avatar.textContent.trim()).toBe('M');
    expect(avatar.style.backgroundColor).not.toBe('');
  });

  it('shows an "In N days" chip for a status-less upcoming date when relativeDate is on', async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 8);
    const date = `${soon.getFullYear()}-${`${soon.getMonth() + 1}`.padStart(2, '0')}-${`${soon.getDate()}`.padStart(2, '0')}`;
    fixture.componentRef.setInput('relativeDate', true);
    fixture.componentRef.setInput('section', {
      data: [{ code: 'B1', title: 'Meera Patel', subtitle: null, status: null, date }],
      source: null,
      isPlaceholder: false,
      placeholderFields: null,
    });
    await fixture.whenStable();

    expect(text()).toContain('In 8 days');
  });

  it('shows the empty message when the section has no rows', async () => {
    fixture.componentRef.setInput('emptyMessage', 'No tasks');
    fixture.componentRef.setInput('section', {
      data: null,
      source: null,
      isPlaceholder: true,
      placeholderFields: null,
    });
    await fixture.whenStable();

    expect(text()).toContain('No tasks');
    expect(text()).toContain('Sample data');
  });

  it('shows a "View all" link only when given a route', async () => {
    fixture.componentRef.setInput('title', 'Team Leave');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();

    fixture.componentRef.setInput('viewAllLink', '/leave/inbox');
    await fixture.whenStable();
    const link = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/leave/inbox');
    expect(link.textContent).toContain('View all');
    expect(link.textContent).toContain('Team Leave');
  });

  it('shows the next-step hint under the empty message', async () => {
    fixture.componentRef.setInput('emptyMessage', 'No team leave');
    fixture.componentRef.setInput('emptySubMessage', 'Leave requests from your team show here');
    await fixture.whenStable();

    expect(text()).toContain('Leave requests from your team show here');
  });
});
