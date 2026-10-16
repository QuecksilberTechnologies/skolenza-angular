import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Common, HolidayCalandarApi, InstitutionLocationApi } from '@core/services';
import { InstitutionLocationRow } from '@shared/interfaces';

import { HolidayForm } from './holiday-form';

const locations: InstitutionLocationRow[] = [
  { id: 5, locationName: 'Head Office', isActive: true },
  { id: 6, locationName: 'Branch Office', isActive: true },
];

describe('HolidayForm', () => {
  let fixture: ComponentFixture<HolidayForm>;

  type Spy = ReturnType<typeof vi.fn>;
  let apiMock: { addHoliday: Spy; updateHoliday: Spy; getHoliday: Spy };
  let dialogRefMock: { close: Spy };

  const holiday = {
    id: 9,
    institutionLocationId: 5,
    holidayName: 'Independence Day',
    holidayDate: '2026-08-15',
    isOptional: false,
    description: 'National holiday',
    icon: 'pi pi-flag',
  };

  const createComponent = async (
    data: Record<string, unknown>,
    getHoliday: Spy = vi
      .fn()
      .mockReturnValue(of({ isSucceeded: true, message: '', errors: [], data: holiday })),
  ) => {
    apiMock = {
      addHoliday: vi.fn().mockReturnValue(of({ isSucceeded: true, message: 'Added' })),
      updateHoliday: vi.fn().mockReturnValue(of({ isSucceeded: true, message: 'Updated' })),
      getHoliday,
    };
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [HolidayForm],
      providers: [
        MessageService,
        { provide: HolidayCalandarApi, useValue: apiMock },
        {
          provide: InstitutionLocationApi,
          useValue: {
            getInstitutionLocations: vi
              .fn()
              .mockReturnValue(of({ isSucceeded: true, message: '', errors: [], data: locations })),
          },
        },
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HolidayForm);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
  };

  it('should create', async () => {
    await createComponent({});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('lists the active locations for the dropdown', async () => {
    await createComponent({});
    expect(fixture.componentInstance['locations']()).toEqual(locations);
  });

  it('starts empty when opened without a holiday', async () => {
    await createComponent({});
    expect(fixture.componentInstance['model']()).toMatchObject({
      institutionLocationId: null,
      holidayName: '',
      isOptional: false,
    });
  });

  it('prefills from the holiday it was opened with', async () => {
    await createComponent({ holiday });
    expect(fixture.componentInstance['model']()).toMatchObject({
      institutionLocationId: 5,
      holidayName: 'Independence Day',
      isOptional: false,
      description: 'National holiday',
      icon: 'pi pi-flag',
    });
    expect(fixture.componentInstance['model']().holidayDate).toEqual(new Date('2026-08-15'));
  });

  describe('fresh read on edit', () => {
    it('fetches the holiday by id and overwrites the model once it resolves', async () => {
      const getHoliday = vi.fn().mockReturnValue(
        of({
          isSucceeded: true,
          message: '',
          errors: [],
          data: { ...holiday, holidayName: 'Independence Day (updated)' },
        }),
      );
      await createComponent({ holiday }, getHoliday);

      expect(getHoliday).toHaveBeenCalledWith(holiday.id);
      expect(fixture.componentInstance['model']().holidayName).toBe('Independence Day (updated)');
    });

    it('leaves the passed-in row editable when the fresh read fails', async () => {
      const getHoliday = vi
        .fn()
        .mockReturnValue(of({ isSucceeded: false, message: 'Not found', errors: [], data: null }));
      await createComponent({ holiday }, getHoliday);

      expect(fixture.componentInstance['model']().holidayName).toBe('Independence Day');
      expect(fixture.componentInstance['isLoadingHoliday']()).toBe(false);
    });

    it('does not fetch anything when opened without a holiday', async () => {
      const getHoliday = vi.fn();
      await createComponent({}, getHoliday);

      expect(getHoliday).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('reports an unselected location as required', async () => {
      await createComponent({});
      const component = fixture.componentInstance;

      expect(component['f'].institutionLocationId().errors()[0]?.message).toBe('Location is required');
    });

    it('reports a blank holiday name as required', async () => {
      await createComponent({});
      expect(fixture.componentInstance['f'].holidayName().errors()[0]?.message).toBe(
        'Holiday name is required',
      );
    });

    it('reports a missing date as required', async () => {
      await createComponent({});
      expect(fixture.componentInstance['f'].holidayDate().errors()[0]?.message).toBe(
        'Date is required',
      );
    });

    it('accepts a fully filled model', async () => {
      await createComponent({});
      fixture.componentInstance['model'].update((m) => ({
        ...m,
        institutionLocationId: 5,
        holidayName: 'Republic Day',
        holidayDate: new Date('2027-01-26'),
      }));

      expect(fixture.componentInstance['f']().invalid()).toBe(false);
    });
  });

  describe('submit', () => {
    it('adds a new holiday with the location, date and description serialized', async () => {
      await createComponent({});
      const component = fixture.componentInstance;

      component['model'].set({
        institutionLocationId: 6,
        holidayName: 'Republic Day',
        holidayDate: new Date(2027, 0, 26),
        isOptional: true,
        description: '  Full-day holiday  ',
        icon: null,
      });
      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(apiMock.addHoliday).toHaveBeenCalledWith({
        institutionLocationId: 6,
        holidayName: 'Republic Day',
        holidayDate: '2027-01-26',
        isOptional: true,
        description: 'Full-day holiday',
        icon: null,
      });
      expect(dialogRefMock.close).toHaveBeenCalledWith(true);
    });

    it('updates the existing holiday by id', async () => {
      await createComponent({ holiday });
      const component = fixture.componentInstance;

      component.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(apiMock.updateHoliday).toHaveBeenCalledWith(
        holiday.id,
        expect.objectContaining({
          id: holiday.id,
          holidayName: 'Independence Day',
          icon: 'pi pi-flag',
        }),
      );
      expect(dialogRefMock.close).toHaveBeenCalledWith(true);
    });

    it('does not submit while the form is invalid', async () => {
      await createComponent({});
      fixture.componentInstance.onSubmit();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(apiMock.addHoliday).not.toHaveBeenCalled();
    });
  });

  it('closes without saving on cancel', async () => {
    await createComponent({});
    fixture.componentInstance.onCancel();

    expect(dialogRefMock.close).toHaveBeenCalledWith();
    expect(apiMock.addHoliday).not.toHaveBeenCalled();
  });
});
