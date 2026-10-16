import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HolidayCalendarStyle } from '@shared/interfaces';

import { HolidayBadge, HolidayBadgeKind } from './holiday-badge';

describe('HolidayBadge', () => {
  let fixture: ComponentFixture<HolidayBadge>;

  function render(kind: HolidayBadgeKind, apiStyle: HolidayCalendarStyle | null = null) {
    fixture = TestBed.createComponent(HolidayBadge);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('apiStyle', apiStyle);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    ['mandatory', 'Mandatory', 'bg-red-50'],
    ['optional', 'Optional', 'bg-amber-50'],
    ['next', 'Next up', 'bg-emerald-50'],
    ['today', 'Today', 'bg-primary-50'],
  ] as const)('renders the built-in %s tone without an API style', (kind, label, tone) => {
    const host = render(kind);

    expect(host.textContent?.trim()).toBe(label);
    expect(host.classList).toContain(tone);
    expect(host.style.backgroundColor).toBe('');
  });

  it('renders the API colour as a soft tint with the trimmed API label', () => {
    const host = render('mandatory', {
      statusCode: 'MANDATORY_HOLIDAY',
      label: 'Mandatory holiday',
      backgroundColor: '#DC2626',
      textColor: '#FFFFFF',
      priority: 900,
    });

    expect(host.textContent?.trim()).toBe('Mandatory');
    expect(host.classList).toContain('bg-(--badge-bg)');
    expect(host.classList).not.toContain('bg-red-50');
    expect(host.style.backgroundColor).toBe('');
    expect(host.style.getPropertyValue('--badge-fg')).toBe('#791515');
    expect(host.style.getPropertyValue('--badge-bg')).toBe('#fce9e9');
    expect(host.style.getPropertyValue('--badge-fg-dark')).toBe('#ef9d9d');
    expect(host.style.getPropertyValue('--badge-bg-dark')).toBe('#4b2729');
  });

  it('keeps the built-in tone when the API colour cannot form a readable tint', () => {
    const host = render('optional', {
      statusCode: 'OPTIONAL_HOLIDAY',
      label: 'Optional holiday',
      backgroundColor: '#FEF3C7',
      textColor: '#92400E',
      priority: 400,
    });

    expect(host.textContent?.trim()).toBe('Optional');
    expect(host.classList).toContain('bg-amber-50');
    expect(host.style.getPropertyValue('--badge-bg')).toBe('');
  });
});
