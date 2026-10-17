import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffCurriculumDeliveryApi } from '@core/services';

import { CurriculumFrameworkDialog } from './curriculum-framework-dialog';
import { CurriculumFrameworkFormModel } from './curriculum-framework-dialog.schema';

describe('CurriculumFrameworkDialog', () => {
  let saveFramework: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;

  function create() {
    saveFramework = vi.fn(() => of({ isSucceeded: true, message: 'Saved', data: {} }));
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: StaffCurriculumDeliveryApi, useValue: { saveFramework } },
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: DynamicDialogConfig, useValue: { data: { sessions: [] } } },
      ],
    });
    const fixture = TestBed.createComponent(CurriculumFrameworkDialog);
    fixture.detectChanges();
    // Protected members are the dialog's template API; the spec drives them directly.
    return fixture.componentInstance as unknown as {
      model: { set(value: CurriculumFrameworkFormModel): void };
      save(): void;
    };
  }

  const filled = (effectiveTo: Date | null): CurriculumFrameworkFormModel => ({
    academicSessionId: 4,
    code: ' CBSE-2026 ',
    name: 'CBSE 2026',
    authorityName: 'CBSE',
    version: '2026.1',
    effectiveFrom: new Date(2026, 3, 1),
    effectiveTo,
    isActive: true,
  });

  beforeEach(() => TestBed.resetTestingModule());

  it('does not save while required fields are empty', () => {
    const dialog = create();

    dialog.save();

    expect(saveFramework).not.toHaveBeenCalled();
  });

  it('rejects an effective-to date before the effective-from date', () => {
    const dialog = create();
    dialog.model.set(filled(new Date(2026, 2, 31)));

    dialog.save();

    expect(saveFramework).not.toHaveBeenCalled();
  });

  it('saves trimmed values with local yyyy-MM-dd dates and closes with true', async () => {
    const dialog = create();
    dialog.model.set(filled(new Date(2027, 2, 31)));

    dialog.save();
    await Promise.resolve();

    expect(saveFramework).toHaveBeenCalledWith(
      expect.objectContaining({
        academicSessionId: 4,
        code: 'CBSE-2026',
        effectiveFrom: '2026-04-01',
        effectiveTo: '2027-03-31',
      }),
    );
    expect(close).toHaveBeenCalledWith(true);
  });
});
