import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffCurriculumDeliveryApi } from '@core/services';
import { LessonPlan } from '@shared/interfaces';

import { coverageForPlan, LessonDeliveryDialog } from './lesson-delivery-dialog';
import { LessonDeliveryFormModel } from './lesson-delivery-dialog.schema';

const plan = (id: number, topics: { id: number; name: string }[]) =>
  ({ id, courseOfferingName: 'Maths', plannedDate: '2026-10-17', topics }) as unknown as LessonPlan;

describe('coverageForPlan', () => {
  it('starts every topic of the plan fully covered and is empty without a plan', () => {
    expect(coverageForPlan(plan(5, [{ id: 11, name: 'Fractions' }]))).toEqual([
      { curriculumTopicId: 11, name: 'Fractions', completionPercent: 100 },
    ]);
    expect(coverageForPlan(undefined)).toEqual([]);
  });
});

describe('LessonDeliveryDialog', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function create(data: object) {
    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: StaffCurriculumDeliveryApi, useValue: {} },
        { provide: DynamicDialogRef, useValue: { close: vi.fn() } },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    });
    const fixture = TestBed.createComponent(LessonDeliveryDialog);
    // Protected members are the dialog's template API; the spec drives them directly.
    return fixture.componentInstance as unknown as {
      model: {
        (): LessonDeliveryFormModel;
        update(fn: (value: LessonDeliveryFormModel) => LessonDeliveryFormModel): void;
      };
      onPlanChange(): void;
    };
  }

  it('preselects the plan, loads its topics and defaults to the local calendar day', () => {
    // 23:30 local on 17 October: the UTC day may already be the 18th.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 17, 23, 30));
    const approved = plan(5, [{ id: 11, name: 'Fractions' }]);

    const dialog = create({ approvedPlans: [approved], plans: [approved], lessonPlanId: 5 });

    expect(dialog.model().lessonPlanId).toBe(5);
    expect(dialog.model().deliveredDate).toEqual(new Date(2026, 9, 17));
    expect(dialog.model().coverage).toEqual([
      { curriculumTopicId: 11, name: 'Fractions', completionPercent: 100 },
    ]);
  });

  it('replaces coverage rows when another plan is picked', () => {
    const first = plan(5, [{ id: 11, name: 'Fractions' }]);
    const second = plan(6, [{ id: 12, name: 'Decimals' }]);
    const dialog = create({
      approvedPlans: [first, second],
      plans: [first, second],
      lessonPlanId: 5,
    });

    dialog.model.update((value) => ({ ...value, lessonPlanId: 6 }));
    dialog.onPlanChange();

    expect(dialog.model().coverage.map((row) => row.name)).toEqual(['Decimals']);
  });
});
