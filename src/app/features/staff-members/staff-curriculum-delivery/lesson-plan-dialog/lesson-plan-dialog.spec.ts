import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffCurriculumDeliveryApi } from '@core/services';
import { CurriculumUnit, LessonPlan, StaffTeachingAssignment } from '@shared/interfaces';

import { LessonPlanDialog } from './lesson-plan-dialog';

describe('LessonPlanDialog', () => {
  // Plan 5 links topics 11 and 12, which belong to a framework the page has not loaded.
  const plan = {
    id: 5,
    staffTeachingAssignmentId: 2,
    plannedDate: '2026-04-10',
    objectives: 'Fractions',
    homework: 'Worksheet 3',
    isActive: true,
    topics: [{ id: 11 }, { id: 12 }],
  } as unknown as LessonPlan;
  const assignments = [
    { id: 2, courseOfferingId: 7 },
    { id: 3, courseOfferingId: 8 },
  ] as StaffTeachingAssignment[];
  const units = [{ courseOfferingId: 8, topics: [{ id: 21 }] }] as unknown as CurriculumUnit[];

  let saveLessonPlan: ReturnType<typeof vi.fn>;

  function create() {
    saveLessonPlan = vi.fn(() => of({ isSucceeded: true, message: 'Saved', data: plan }));
    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: StaffCurriculumDeliveryApi, useValue: { saveLessonPlan } },
        { provide: DynamicDialogRef, useValue: { close: vi.fn() } },
        { provide: DynamicDialogConfig, useValue: { data: { plan, assignments, units } } },
      ],
    });
    const fixture = TestBed.createComponent(LessonPlanDialog);
    fixture.detectChanges();
    // Protected members are the dialog's template API; the spec drives them directly.
    return fixture.componentInstance as unknown as {
      model: { update(fn: (value: Record<string, unknown>) => Record<string, unknown>): void };
      save(): void;
    };
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('keeps the saved topics when only other fields change', async () => {
    const dialog = create();
    dialog.model.update((value) => ({ ...value, objectives: 'Fractions and decimals' }));

    dialog.save();
    await Promise.resolve();

    expect(saveLessonPlan).toHaveBeenCalledWith(
      expect.objectContaining({ curriculumTopicIds: [11, 12] }),
    );
  });

  it('drops topics that do not fit a newly chosen assignment', async () => {
    const dialog = create();
    dialog.model.update((value) => ({
      ...value,
      staffTeachingAssignmentId: 3,
      curriculumTopicIds: [11, 21],
    }));

    dialog.save();
    await Promise.resolve();

    expect(saveLessonPlan).toHaveBeenCalledWith(
      expect.objectContaining({ curriculumTopicIds: [21] }),
    );
  });

  it('sends a cleared optional field as an empty string so the server clears it', async () => {
    const dialog = create();
    dialog.model.update((value) => ({ ...value, homework: '   ' }));

    dialog.save();
    await Promise.resolve();

    expect(saveLessonPlan).toHaveBeenCalledWith(expect.objectContaining({ homework: '' }));
  });
});
