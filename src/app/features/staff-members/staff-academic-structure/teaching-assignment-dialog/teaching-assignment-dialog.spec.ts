import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { AcademicMaster, StaffTeachingAssignment } from '@shared/interfaces';

import {
  TeachingAssignmentDialog,
  TeachingAssignmentDialogData,
} from './teaching-assignment-dialog';

interface DialogHandle {
  model: { update(fn: (value: Record<string, unknown>) => Record<string, unknown>): void };
  sectionOptions(): AcademicMaster[];
  save(): void;
}

describe('TeachingAssignmentDialog', () => {
  const offering = {
    id: 5,
    name: 'Maths 10',
    academicGroupId: 9,
    isActive: true,
  } as AcademicMaster;
  const sections = [
    { id: 1, name: '10-A', academicGroupId: 9, isActive: true },
    { id: 2, name: '11-A', academicGroupId: 8, isActive: true },
    { id: 3, name: '10-B', academicGroupId: 9, isActive: false },
  ] as AcademicMaster[];

  let save: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;

  function create(assignment?: StaffTeachingAssignment): DialogHandle {
    save = vi.fn(() => of({ isSucceeded: true, message: 'Saved', data: {} }));
    close = vi.fn();
    const data: TeachingAssignmentDialogData = {
      staffMemberId: 'S-1',
      assignment,
      offerings: [offering],
      sections,
      assignmentTypes: [{ id: 1, code: 'LEAD', name: 'Lead teacher' }],
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: StaffAcademicStructureApi, useValue: { saveTeachingAssignment: save } },
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    });
    const fixture = TestBed.createComponent(TeachingAssignmentDialog);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as DialogHandle;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('offers only sections of the chosen offering group', () => {
    const dialog = create();
    dialog.model.update((value) => ({ ...value, courseOfferingId: 5 }));

    expect(dialog.sectionOptions().map((item) => item.id)).toEqual([1]);
  });

  it('keeps a saved section that was deactivated, locked', () => {
    const dialog = create({
      id: 4,
      courseOfferingId: 5,
      classSectionId: 3,
      assignmentType: 1,
      contributionPercent: 100,
      effectiveFrom: '2026-04-01',
      isPrimary: true,
      isActive: true,
    } as StaffTeachingAssignment);

    expect(
      dialog.sectionOptions().map((item) => [item.id, (item as { disabled?: boolean }).disabled]),
    ).toEqual([
      [1, false],
      [3, true],
    ]);
  });

  it('rejects a contribution outside 1 to 100 and an end before the start', async () => {
    const dialog = create();
    dialog.model.update((value) => ({
      ...value,
      courseOfferingId: 5,
      classSectionId: 1,
      contributionPercent: 120,
    }));
    dialog.save();
    await Promise.resolve();
    expect(save).not.toHaveBeenCalled();

    dialog.model.update((value) => ({
      ...value,
      contributionPercent: 50,
      effectiveFrom: new Date(2026, 5, 10),
      effectiveTo: new Date(2026, 5, 1),
    }));
    dialog.save();
    await Promise.resolve();
    expect(save).not.toHaveBeenCalled();
  });

  it('saves local calendar dates for the staff member and closes with true', async () => {
    const dialog = create();
    dialog.model.update((value) => ({
      ...value,
      courseOfferingId: 5,
      classSectionId: 1,
      effectiveFrom: new Date(2026, 5, 1),
    }));

    dialog.save();
    await Promise.resolve();

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        staffMemberId: 'S-1',
        courseOfferingId: 5,
        classSectionId: 1,
        contributionPercent: 100,
        effectiveFrom: '2026-06-01',
      }),
    );
    expect(save.mock.calls[0][0]).not.toHaveProperty('effectiveTo', expect.anything());
    expect(close).toHaveBeenCalledWith(true);
  });
});
