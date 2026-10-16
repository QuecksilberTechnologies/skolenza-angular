import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MetricsCard } from './metrics-card';

const section = (
  metrics: { code: string; label: string; value: number; unit: string | null }[],
) => ({
  data: { metrics },
  source: null,
  isPlaceholder: true,
  placeholderFields: null,
});

describe('MetricsCard', () => {
  let fixture: ComponentFixture<MetricsCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricsCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(MetricsCard);
  });

  const text = () => fixture.nativeElement.textContent as string;

  it('renders each metric with its unit', async () => {
    fixture.componentRef.setInput(
      'section',
      section([
        { code: 'A', label: 'Present', value: 92, unit: '%' },
        { code: 'B', label: 'Late', value: 3, unit: 'days' },
        { code: 'C', label: 'Total', value: 8, unit: null },
      ]),
    );
    await fixture.whenStable();

    expect(text()).toContain('92%');
    expect(text()).toContain('3 days');
    expect(text()).toContain('Total');
    expect(text()).toContain('Sample data');
  });

  it('turns a tile with a route into a link and leaves the rest static', async () => {
    fixture.componentRef.setInput(
      'section',
      section([
        { code: 'PENDING_APPROVALS', label: 'Pending Approvals', value: 2, unit: null },
        { code: 'ABSENT', label: 'Absent', value: 1, unit: null },
      ]),
    );
    fixture.componentRef.setInput('links', { PENDING_APPROVALS: '/leave/inbox' });
    await fixture.whenStable();

    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/leave/inbox');
    expect(links[0].textContent).toContain('Pending Approvals');
  });

  it('hides the sample-data badge when the page already says so', async () => {
    fixture.componentRef.setInput(
      'section',
      section([{ code: 'A', label: 'Total', value: 1, unit: null }]),
    );
    fixture.componentRef.setInput('placeholderBadge', false);
    await fixture.whenStable();

    expect(text()).not.toContain('Sample data');
  });

  it('shows an empty state without a section', async () => {
    await fixture.whenStable();

    expect(text()).toContain('No data yet');
    expect(text()).not.toContain('Sample data');
  });
});
