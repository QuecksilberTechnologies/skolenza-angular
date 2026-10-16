import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCardHeader } from './dashboard-card-header';

describe('DashboardCardHeader', () => {
  let fixture: ComponentFixture<DashboardCardHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DashboardCardHeader] }).compileComponents();
    fixture = TestBed.createComponent(DashboardCardHeader);
    fixture.componentRef.setInput('title', 'Team Leave');
  });

  const text = () => fixture.nativeElement.textContent as string;

  it('renders the title as an h3', async () => {
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('h3')?.textContent).toContain('Team Leave');
  });

  it('shows the sample-data badge only for placeholder sections', async () => {
    await fixture.whenStable();
    expect(text()).not.toContain('Sample data');

    fixture.componentRef.setInput('placeholder', true);
    await fixture.whenStable();
    expect(text()).toContain('Sample data');
  });

  it('announces loading and labels the refresh button', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Loading Team Leave',
    );
    expect(fixture.nativeElement.querySelector('button')?.getAttribute('aria-label')).toBe(
      'Refresh Team Leave',
    );
  });

  it('emits refresh on click', async () => {
    let emitted = 0;
    fixture.componentInstance.refresh.subscribe(() => emitted++);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('button').click();

    expect(emitted).toBe(1);
  });

  it('hides the refresh button when not refreshable but still announces loading', async () => {
    fixture.componentRef.setInput('refreshable', false);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });
});
