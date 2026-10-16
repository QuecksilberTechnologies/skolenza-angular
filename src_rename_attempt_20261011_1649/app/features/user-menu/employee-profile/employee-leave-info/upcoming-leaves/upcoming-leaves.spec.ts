import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpcomingLeaves } from './upcoming-leaves';

describe('UpcomingLeaves', () => {
  let component: UpcomingLeaves;
  let fixture: ComponentFixture<UpcomingLeaves>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingLeaves],
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingLeaves);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a single date for one-day leave and a range otherwise', () => {
    fixture.componentRef.setInput('upcomingLeaves', [
      {
        id: 1,
        type: 'Sick Leave',
        startDate: '2026-04-18',
        endDate: '2026-04-18',
        status: 'Pending',
        statusColor: '',
        days: 1,
      },
      {
        id: 2,
        type: 'Casual Leave',
        startDate: '2026-05-01',
        endDate: '2026-05-02',
        status: 'Approved',
        statusColor: '',
        days: 2,
      },
    ]);
    fixture.detectChanges();

    const dateCells = [...fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(2)')].map(
      (td: HTMLElement) => td.textContent!.trim(),
    );
    expect(dateCells).toEqual(['Apr 18, 2026', 'May 1, 2026 – May 2, 2026']);
  });
});
