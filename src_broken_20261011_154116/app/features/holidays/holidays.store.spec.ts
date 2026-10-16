import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Common, HolidayCalandarApi, InstitutionLocationApi } from '@core/services';
import { Holiday, HolidayCalendarStyle } from '@shared/interfaces';
import { localDateKey } from '@shared/utilities/date-key';

import { HolidaysStore } from './holidays.store';

const MANDATORY_STYLE: HolidayCalendarStyle = {
  statusCode: 'MANDATORY_HOLIDAY',
  label: 'Mandatory holiday',
  backgroundColor: '#DC2626',
  textColor: '#FFFFFF',
  priority: 900,
};

const OPTIONAL_STYLE: HolidayCalendarStyle = {
  statusCode: 'OPTIONAL_HOLIDAY',
  label: 'Optional holiday',
  backgroundColor: '#F59E0B',
  textColor: '#111827',
  priority: 400,
};

function createHoliday(overrides: Partial<Holiday> = {}): Holiday {
  return {
    id: 1,
    institutionLocationId: 5,
    holidayName: 'Independence Day',
    holidayDate: '2026-08-15',
    isOptional: false,
    description: null,
    icon: null,
    isActive: true,
    ...overrides,
  };
}

describe('HolidaysStore', () => {
  const holidayCalandarApiMock = {
    getHolidays: vi.fn(),
    deleteHoliday: vi.fn(),
    getCalendarDisplayConstants: vi.fn(),
  };

  const commonMock = { showMessage: vi.fn() };

  const institutionLocationApiMock = {
    getInstitutionLocations: vi.fn(() =>
      of({
        isSucceeded: true,
        message: '',
        data: [{ id: 5, locationName: 'Indore HQ', isActive: true }],
      }),
    ),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    holidayCalandarApiMock.getCalendarDisplayConstants.mockReturnValue(
      of({ isSucceeded: true, message: '', data: { styles: [MANDATORY_STYLE, OPTIONAL_STYLE] } }),
    );

    TestBed.configureTestingModule({
      providers: [
        HolidaysStore,
        { provide: HolidayCalandarApi, useValue: holidayCalandarApiMock },
        { provide: InstitutionLocationApi, useValue: institutionLocationApiMock },
        { provide: Common, useValue: commonMock },
      ],
    });
  });

  describe('holidayRows', () => {
    it('resolves locationName from institutionLocationId', async () => {
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        of({ isSucceeded: true, message: '', errors: [], data: [createHoliday()] }),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(store.holidayRows()[0].locationName).toBe('Indore HQ');
    });
  });

  describe('holidayTypeStyles', () => {
    it('picks the mandatory and optional styles out of the API palette', async () => {
      const store = TestBed.inject(HolidaysStore);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(store.holidayTypeStyles()).toEqual({
        mandatory: MANDATORY_STYLE,
        optional: OPTIONAL_STYLE,
      });
    });

    it('is null for both on a business failure', async () => {
      holidayCalandarApiMock.getCalendarDisplayConstants.mockReturnValue(
        of({ isSucceeded: false, message: 'Nope', data: null }),
      );

      const store = TestBed.inject(HolidaysStore);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(store.holidayTypeStyles()).toEqual({ mandatory: null, optional: null });
    });

    it('is null for both on a transport failure', async () => {
      holidayCalandarApiMock.getCalendarDisplayConstants.mockReturnValue(
        throwError(() => ({ message: 'Network error' })),
      );

      const store = TestBed.inject(HolidaysStore);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(store.holidayTypeStyles()).toEqual({ mandatory: null, optional: null });
    });
  });

  describe('loadHolidays', () => {
    it('populates the list on success', () => {
      const holiday = createHoliday();
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        of({ isSucceeded: true, message: '', errors: [], data: [holiday] }),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();

      expect(store.holidays()).toEqual([holiday]);
      expect(store.isLoading()).toBe(false);
    });

    it('clears the list and surfaces the message on a business failure', () => {
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        of({ isSucceeded: false, message: 'No access', errors: [], data: [] }),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();

      expect(store.holidays()).toEqual([]);
      expect(commonMock.showMessage).toHaveBeenCalledWith('No access', 'error');
    });

    it('surfaces the error message on a transport failure', () => {
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        throwError(() => ({ message: 'Network error' })),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();

      expect(commonMock.showMessage).toHaveBeenCalledWith('Network error', 'error');
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('todayHoliday', () => {
    it('matches a holiday dated today', () => {
      const today = localDateKey();
      const holiday = createHoliday({ holidayDate: today });
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        of({ isSucceeded: true, message: '', errors: [], data: [holiday] }),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();

      expect(store.todayHoliday()).toEqual(holiday);
    });

    it('matches a holiday dated today that carries a time part', () => {
      const holiday = createHoliday({ holidayDate: `${localDateKey()}T00:00:00` });
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        of({ isSucceeded: true, message: '', errors: [], data: [holiday] }),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();

      expect(store.todayHoliday()).toEqual(holiday);
    });

    it('is null when nothing lands on today', () => {
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        of({
          isSucceeded: true,
          message: '',
          errors: [],
          data: [createHoliday({ holidayDate: '2020-01-01' })],
        }),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();

      expect(store.todayHoliday()).toBeNull();
    });
  });

  describe('deleteHoliday', () => {
    it('removes the row on success', () => {
      const holiday = createHoliday();
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        of({ isSucceeded: true, message: '', errors: [], data: [holiday] }),
      );
      holidayCalandarApiMock.deleteHoliday.mockReturnValue(
        of({ isSucceeded: true, message: 'Deleted', errors: [], data: null }),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();
      store.deleteHoliday(holiday.id);

      expect(holidayCalandarApiMock.deleteHoliday).toHaveBeenCalledWith(holiday.id);
      expect(store.holidays()).toEqual([]);
      expect(commonMock.showMessage).toHaveBeenCalledWith('Deleted', 'success');
    });

    it('leaves the row in place on a business failure', () => {
      const holiday = createHoliday();
      holidayCalandarApiMock.getHolidays.mockReturnValue(
        of({ isSucceeded: true, message: '', errors: [], data: [holiday] }),
      );
      holidayCalandarApiMock.deleteHoliday.mockReturnValue(
        of({ isSucceeded: false, message: 'Cannot delete', errors: [], data: null }),
      );

      const store = TestBed.inject(HolidaysStore);
      store.loadHolidays();
      store.deleteHoliday(holiday.id);

      expect(store.holidays()).toEqual([holiday]);
      expect(commonMock.showMessage).toHaveBeenCalledWith('Cannot delete', 'error');
    });
  });
});
