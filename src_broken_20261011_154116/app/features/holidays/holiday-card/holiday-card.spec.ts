import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';

import { HolidayCard } from './holiday-card';

describe('HolidayCard', () => {
  let component: HolidayCard;
  let fixture: ComponentFixture<HolidayCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HolidayCard],
      providers: [MessageService, DatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(HolidayCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('holiday', {
      id: 1,
      holidayName: 'Test Holiday',
      holidayDate: new Date().toISOString(),
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([
    ['pi pi-flag', 1],
    ['bi bi-calendar-event', 0],
  ])('renders icon %j only when it is a PrimeIcons class', (icon, count) => {
    fixture.componentRef.setInput('holiday', {
      id: 1,
      holidayName: 'Test Holiday',
      holidayDate: new Date().toISOString(),
      icon,
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('h3 i')).toHaveLength(count);
  });

  it('renders the mandatory badge as a tint of the API palette', () => {
    fixture.componentRef.setInput('typeStyles', {
      mandatory: {
        statusCode: 'MANDATORY_HOLIDAY',
        label: 'Mandatory holiday',
        backgroundColor: '#DC2626',
        textColor: '#FFFFFF',
        priority: 900,
      },
      optional: null,
    });
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      'app-holiday-badge',
    );
    expect(badge?.textContent?.trim()).toBe('Mandatory');
    expect(badge?.classList).toContain('bg-(--badge-bg)');
  });
});
