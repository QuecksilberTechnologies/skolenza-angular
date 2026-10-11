import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { StatCard } from './stat-card';

describe('StatCard', () => {
  let fixture: ComponentFixture<StatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(StatCard);
    fixture.componentRef.setInput('icon', 'pi pi-users');
  });

  const el = () => fixture.nativeElement as HTMLElement;

  it('shows the value and label without a link by default', async () => {
    fixture.componentRef.setInput('value', 8);
    fixture.componentRef.setInput('label', 'Team Members');
    await fixture.whenStable();

    expect(el().textContent).toContain('8');
    expect(el().textContent).toContain('Team Members');
    expect(el().querySelector('a')).toBeNull();
    expect(el().querySelector('.pi-users')).not.toBeNull();
  });

  it('becomes a link named by its value and label when given a route', async () => {
    fixture.componentRef.setInput('value', 8);
    fixture.componentRef.setInput('label', 'Team Members');
    fixture.componentRef.setInput('link', '/staff-members');
    await fixture.whenStable();

    const link = el().querySelector('a');
    expect(link?.getAttribute('href')).toBe('/staff-members');
    expect(link?.getAttribute('aria-label')).toBe('8 Team Members');
    expect(link?.querySelector('.pi-arrow-right')).not.toBeNull();
  });

  it('paints the number red for the danger tone', async () => {
    fixture.componentRef.setInput('value', 1);
    fixture.componentRef.setInput('tone', 'danger');
    await fixture.whenStable();

    expect(el().querySelector('.text-red-700')?.textContent?.trim()).toBe('1');
  });

  it('renders a hidden skeleton while loading', async () => {
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('label', 'Team Members');
    await fixture.whenStable();

    expect(el().textContent).not.toContain('Team Members');
    expect(el().querySelector('[aria-hidden="true"] .animate-pulse')).not.toBeNull();
  });
});
