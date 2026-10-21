import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { InstitutionStaffCategory } from '@shared/interfaces';

import { StaffCategoryDialog } from './staff-category-dialog';

describe('StaffCategoryDialog', () => {
  const saved = {
    id: 4,
    staffCategoryTypeId: 1,
    code: 'TEACHING',
    name: 'Teaching',
    description: '',
    displayOrder: 10,
    isActive: true,
    staffJobFamilyMasterIds: [],
  } as unknown as InstitutionStaffCategory;

  let close: ReturnType<typeof vi.fn>;

  function create(category?: InstitutionStaffCategory) {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: LookupStore, useValue: { staffCategories: signal([]) } },
        {
          provide: StaffProfessionalStructureApi,
          useValue: {
            saveCategory: vi.fn(() => of({ isSucceeded: true, message: 'Saved', data: saved })),
            // The category saves; its job-family mapping does not.
            setCategoryJobFamilies: vi.fn(() =>
              of({ isSucceeded: false, message: 'Mapping failed', data: false }),
            ),
          },
        },
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: DynamicDialogConfig, useValue: { data: { category, jobFamilies: [] } } },
      ],
    });
    const fixture = TestBed.createComponent(StaffCategoryDialog);
    fixture.detectChanges();
    // Protected members are the dialog's template API; the spec drives them directly.
    return fixture.componentInstance as unknown as {
      model: { update(fn: (value: Record<string, unknown>) => Record<string, unknown>): void };
      save(): void;
    };
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('stays open for a retry when an edit fails to map job families', async () => {
    const dialog = create(saved);

    dialog.save();
    await Promise.resolve();

    expect(close).not.toHaveBeenCalled();
  });

  it('closes after a new category saves even if the mapping fails, so a retry cannot duplicate it', async () => {
    const dialog = create();
    dialog.model.update((value) => ({
      ...value,
      staffCategoryTypeId: 1,
      code: 'SUPPORT',
      name: 'Support',
    }));

    dialog.save();
    await Promise.resolve();

    expect(close).toHaveBeenCalledWith(true);
  });
});
