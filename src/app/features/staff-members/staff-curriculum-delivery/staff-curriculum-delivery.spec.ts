import { TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi, StaffCurriculumDeliveryApi } from '@core/services';
import { CurriculumUnit, LessonPlan, StaffTeachingAssignment } from '@shared/interfaces';

import StaffCurriculumDelivery, { topicsForTeachingAssignment } from './staff-curriculum-delivery';

describe('StaffCurriculumDelivery topic selection', () => {
  it('offers only topics belonging to the selected teaching assignment course offering', () => {
    const units = [
      { courseOfferingId: 11, topics: [{ id: 101, name: 'Fractions' }] },
      { courseOfferingId: 22, topics: [{ id: 202, name: 'Grammar' }] },
    ] as CurriculumUnit[];
    const assignments = [
      { id: 7, courseOfferingId: 11 },
      { id: 8, courseOfferingId: 22 },
    ] as StaffTeachingAssignment[];

    expect(topicsForTeachingAssignment(units, assignments, 7).map((topic) => topic.id)).toEqual([
      101,
    ]);
  });

  it('offers no topics until a valid teaching assignment is selected', () => {
    expect(topicsForTeachingAssignment([], [], 0)).toEqual([]);
  });
});

describe('StaffCurriculumDelivery', () => {
  // Every API method answers with an empty successful list.
  const emptyApi = () =>
    new Proxy({}, { get: () => vi.fn(() => of({ isSucceeded: true, message: '', data: [] })) });

  let component: StaffCurriculumDelivery;
  let common: {
    setPageHeaderInfo: ReturnType<typeof vi.fn>;
    setBreadcrumbItems: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    common = { setPageHeaderInfo: vi.fn(), setBreadcrumbItems: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        { provide: Common, useValue: { ...common, showMessage: vi.fn() } },
        { provide: StaffCurriculumDeliveryApi, useValue: emptyApi() },
        { provide: StaffAcademicStructureApi, useValue: emptyApi() },
      ],
    });
    common = TestBed.inject(Common) as unknown as typeof common;
    component = TestBed.runInInjectionContext(() => new StaffCurriculumDelivery());
  });

  afterEach(() => vi.useRealTimers());

  it('shows a breadcrumb back to the Staff Directory', () => {
    component.ngOnInit();

    expect(common.setPageHeaderInfo).toHaveBeenCalledWith(
      expect.objectContaining({ isBreadcrumbShow: true }),
    );
    expect(common.setBreadcrumbItems).toHaveBeenCalledWith([
      { label: 'Staff Directory', routerLink: '/app/staff' },
      { label: 'Curriculum & Lesson Delivery' },
    ]);
  });

  it('escapes the record label in the delete confirmation', () => {
    const confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    component.confirmDelete('frameworks', 1, '<img src=x onerror=alert(1)>');

    expect((confirmSpy.mock.calls[0][0] as Confirmation).message).toBe(
      'Delete "&lt;img src=x onerror=alert(1)&gt;"? Records already in use must be removed first.',
    );
  });

  it('defaults the delivered date to the local calendar day, not the UTC day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 1, 0));

    component.usePlanForDelivery({ id: 5, topics: [] } as unknown as LessonPlan);

    expect(component.deliveryForm.deliveredDate).toBe('2026-10-17');
  });
});

describe('StaffCurriculumDelivery list loading', () => {
  it('clears units on framework switch and ignores the previous framework response', () => {
    const unitsA = new Subject<{ isSucceeded: boolean; message: string; data: CurriculumUnit[] }>();
    const unitsB = new Subject<{ isSucceeded: boolean; message: string; data: CurriculumUnit[] }>();
    const pendingLookup = new Subject<never>();
    const api = new Proxy(
      { getUnits: vi.fn().mockReturnValueOnce(unitsA).mockReturnValueOnce(unitsB) },
      {
        get: (target, key) =>
          key in target ? target[key as 'getUnits'] : vi.fn(() => pendingLookup),
      },
    );
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        { provide: StaffCurriculumDeliveryApi, useValue: api },
        { provide: StaffAcademicStructureApi, useValue: api },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new StaffCurriculumDelivery());
    const unit = (name: string) => ({
      isSucceeded: true,
      message: '',
      data: [{ id: 1, name, topics: [] } as unknown as CurriculumUnit],
    });

    component.selectFramework(1);
    unitsA.next(unit('Fractions'));
    unitsA.complete();
    component.selectFramework(2);

    expect(component.units()).toEqual([]);
    expect(component.loading.units()).toBe(true);
    // Lookups that never answer do not hold the other lists' skeletons.
    expect(component.loading.plans()).toBe(false);

    unitsB.next(unit('Grammar'));
    unitsB.complete();
    expect(component.units().map((item) => item.name)).toEqual(['Grammar']);
    expect(component.loading.units()).toBe(false);
  });
});
