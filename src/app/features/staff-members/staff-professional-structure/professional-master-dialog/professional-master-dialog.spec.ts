import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { StaffProfessionalMaster, StaffProfessionalMasterType } from '@shared/interfaces';

import { ProfessionalMasterDialog } from './professional-master-dialog';

describe('ProfessionalMasterDialog', () => {
  const saved = {
    id: 7,
    code: 'LIBRARY',
    name: 'Library',
    description: '',
    displayOrder: 40,
    isActive: true,
    requiresCertification: true,
    certificationValidityRequired: false,
    defaultFrequency: '',
    requiresEvidence: true,
  } satisfies StaffProfessionalMaster;

  let saveMaster: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;

  function create(master?: StaffProfessionalMaster) {
    saveMaster = vi.fn(() => of({ isSucceeded: true, message: 'Saved', data: saved }));
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: StaffProfessionalStructureApi, useValue: { saveMaster } },
        { provide: DynamicDialogRef, useValue: { close } },
        {
          provide: DynamicDialogConfig,
          useValue: { data: { type: StaffProfessionalMasterType.JobFamily, master } },
        },
      ],
    });
    const fixture = TestBed.createComponent(ProfessionalMasterDialog);
    fixture.detectChanges();
    // Protected members are the dialog's template API; the spec drives them directly.
    return fixture.componentInstance as unknown as {
      model: { update(fn: (value: Record<string, unknown>) => Record<string, unknown>): void };
      submitted(): boolean;
      save(): void;
    };
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('does not save while required fields are empty', () => {
    const dialog = create();

    dialog.save();

    expect(dialog.submitted()).toBe(true);
    expect(saveMaster).not.toHaveBeenCalled();
  });

  it('saves trimmed values, keeps flags the form does not edit, and closes with true', async () => {
    const dialog = create(saved);
    dialog.model.update((value) => ({ ...value, name: '  Library Services  ' }));

    dialog.save();
    await Promise.resolve();

    expect(saveMaster).toHaveBeenCalledWith(
      StaffProfessionalMasterType.JobFamily,
      expect.objectContaining({
        id: 7,
        name: 'Library Services',
        displayOrder: 40,
        requiresCertification: true,
        requiresEvidence: true,
      }),
    );
    expect(close).toHaveBeenCalledWith(true);
  });
});
