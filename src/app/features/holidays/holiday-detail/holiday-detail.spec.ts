import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { type Mock, vi } from 'vitest';

import { Common, HolidayCalandarApi } from '@core/services';
import { Holiday } from '@shared/interfaces';

import { HolidayDetail } from './holiday-detail';

const holiday: Holiday = {
  id: 1,
  campusId: 5,
  holidayName: 'Holi',
  holidayDate: '2026-03-03',
  isOptional: false,
  description: 'Festival of colours',
  icon: null,
  isActive: true,
  locationName: 'Indore HQ',
};

describe('HolidayDetail', () => {
  let fixture: ComponentFixture<HolidayDetail>;
  let getHoliday: Mock;

  beforeEach(async () => {
    getHoliday = vi
      .fn()
      .mockReturnValue(of({ isSucceeded: true, message: '', errors: [], data: holiday }));
    await TestBed.configureTestingModule({
      imports: [HolidayDetail],
      providers: [
        { provide: HolidayCalandarApi, useValue: { getHoliday } },
        { provide: Common, useValue: { showMessage: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HolidayDetail);
  });

  it('shows the fresh record from GET /{id} over the list row', async () => {
    getHoliday.mockReturnValue(
      of({
        isSucceeded: true,
        message: '',
        errors: [],
        data: { ...holiday, holidayName: 'Holi (updated)' },
      }),
    );
    fixture.componentRef.setInput('holiday', holiday);
    await fixture.whenStable();

    expect(getHoliday).toHaveBeenCalledWith(holiday.id);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Holi (updated)');
  });

  it('keeps the list row location name when GET /{id} omits it', async () => {
    const { locationName: _, ...withoutName } = holiday;
    getHoliday.mockReturnValue(
      of({ isSucceeded: true, message: '', errors: [], data: withoutName }),
    );
    fixture.componentRef.setInput('holiday', holiday);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Indore HQ');
  });

  it('shows a skeleton while the record loads', async () => {
    getHoliday.mockReturnValue(NEVER);
    fixture.componentRef.setInput('holiday', holiday);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Loading holiday details');
    expect(el.querySelector('p-skeleton')).not.toBeNull();
  });

  it('falls back to the list row when the read fails', async () => {
    getHoliday.mockReturnValue(
      of({ isSucceeded: false, message: 'Not found', errors: [], data: null }),
    );
    fixture.componentRef.setInput('holiday', holiday);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Festival of colours');
  });

  it('renders every holiday field', async () => {
    fixture.componentRef.setInput('holiday', holiday);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Holi');
    expect(text).toContain('March 3, 2026');
    expect(text).toContain('Tuesday');
    expect(text).toContain('Mandatory');
    expect(text).toContain('Indore HQ');
    expect(text).toContain('Festival of colours');
  });

  it('hides the edit footer without update rights', async () => {
    fixture.componentRef.setInput('holiday', holiday);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Edit Holiday');
  });
});
