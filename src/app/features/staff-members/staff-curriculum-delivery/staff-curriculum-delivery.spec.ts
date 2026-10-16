import { TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi, StaffCurriculumDeliveryApi } from '@core/services';
import {
  CurriculumUnit,
  LessonDelivery,
  LessonPlan,
  StaffTeachingAssignment,
} from '@shared/interfaces';

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

  it('loads coverage from a directly selected approved plan and clears stale plan topics', () => {
    component.statuses.set([{ id: 3, code: 'APPROVED', name: 'Approved' }]);
    component.plans.set([
      { id: 5, workflowStatusId: 3, topics: [{ id: 11, name: 'Equivalent Fractions' }] },
      { id: 6, workflowStatusId: 3, topics: [{ id: 12, name: 'Comparing Fractions' }] },
    ] as LessonPlan[]);
    component.deliveryForm.lessonPlanId = 5;
    component.onDeliveryPlanChange();
    expect(component.deliveryForm.coverage).toEqual([
      { curriculumTopicId: 11, completionPercent: 100 },
    ]);
    component.deliveryForm.lessonPlanId = 6;
    component.onDeliveryPlanChange();
    expect(component.deliveryForm.coverage).toEqual([
      { curriculumTopicId: 12, completionPercent: 100 },
    ]);
    expect(component.deliveryTopicName(12)).toBe('Comparing Fractions');
    component.deliveryForm.lessonPlanId = 0;
    component.onDeliveryPlanChange();
    expect(component.deliveryForm.coverage).toEqual([]);
  });

  it('opens a rejected delivery for correction without changing the saved row before Save', () => {
    const saved = {
      id: 9,
      lessonPlanId: 5,
      deliveredDate: '2028-04-10',
      coverageNotes: 'Review needed',
      exceptionReason: 'Comparison practice incomplete',
      replanAction: 'Review next lesson',
      isActive: true,
      coverage: [{ curriculumTopicId: 11, completionPercent: 50 }],
    } as LessonDelivery;
    component.editDelivery(saved);
    expect(component.deliveryForm).toEqual(
      expect.objectContaining({ id: 9, lessonPlanId: 5, exceptionReason: saved.exceptionReason }),
    );
    component.deliveryForm.coverage[0].completionPercent = 75;
    expect(saved.coverage[0].completionPercent).toBe(50);
    component.resetDelivery();
    expect(component.deliveryForm.id).toBeUndefined();
    expect(component.deliveryForm.coverage).toEqual([]);
  });

  it('clears edit IDs and selected topics when switching curriculum frameworks', () => {
    component.unitForm.id = 7;
    component.topicForm.id = 8;
    component.topicForm.curriculumUnitId = 7;
    component.planForm.curriculumTopicIds = [8];
    component.selectFramework(2);
    expect(component.unitForm.id).toBeUndefined();
    expect(component.unitForm.curriculumFrameworkId).toBe(2);
    expect(component.topicForm.id).toBeUndefined();
    expect(component.topicForm.curriculumUnitId).toBe(0);
    expect(component.planForm.curriculumTopicIds).toEqual([]);
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
