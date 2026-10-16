import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentHeadcountCard } from './department-headcount-card';

describe('DepartmentHeadcountCard', () => {
  let fixture: ComponentFixture<DepartmentHeadcountCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentHeadcountCard],
    }).compileComponents();
    fixture = TestBed.createComponent(DepartmentHeadcountCard);
  });

  it('sizes each bar against the largest department and totals the headcount', async () => {
    fixture.componentRef.setInput('headcounts', [
      { departmentId: 1, departmentName: 'Engineering', headcount: 8 },
      { departmentId: 2, departmentName: 'Sales', headcount: 2 },
      { departmentId: 3, departmentName: 'Legal', headcount: 0 },
    ]);
    await fixture.whenStable();

    const bars = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="progressbar"]'),
    ].map((bar) => bar.getAttribute('aria-valuenow'));

    expect(bars).toEqual(['100', '25', '0']);
    expect(fixture.nativeElement.textContent).toContain('10');
  });

  it('shows an empty state with no departments', async () => {
    fixture.componentRef.setInput('headcounts', []);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No departments yet');
  });
});
