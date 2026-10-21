import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { AcademicMaster, AcademicMasterType } from '@shared/interfaces';

import {
  AcademicMasterDialog,
  AcademicMasterDialogData,
} from './academic-master-dialog/academic-master-dialog';

/** The dialog's template API is protected; the spec drives it directly. */
interface DialogHandle {
  model: { update(fn: (value: Record<string, unknown>) => Record<string, unknown>): void };
  save(): void;
}

describe('Academic master dialog HTTP contract', () => {
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  function create(type: AcademicMasterType, master?: AcademicMaster): DialogHandle {
    close = vi.fn();
    const data: AcademicMasterDialogData = {
      type,
      master,
      sessions: [],
      programmes: [],
      groups: [],
      subjects: [],
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StaffAcademicStructureApi,
        { provide: Common, useValue: { showMessage: vi.fn() } },
        { provide: DynamicDialogRef, useValue: { close } },
        { provide: DynamicDialogConfig, useValue: { data } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AcademicMasterDialog);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as DialogHandle;
  }

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  for (const type of Object.values(AcademicMasterType)) {
    it(`creates ${type} without a record ID that the API would read as an update`, async () => {
      const dialog = create(type);
      dialog.model.update((value) => ({
        ...value,
        code: 'AY-2028-29',
        name: 'Academic Year 2028-29',
        startDate: new Date(2028, 3, 1),
        endDate: new Date(2029, 2, 31),
      }));

      dialog.save();
      await Promise.resolve();

      const request = http.expectOne((req) => req.url.endsWith(`/masters/${type}`));
      expect(request.request.method).toBe('POST');
      expect(JSON.parse(request.request.serializeBody() as string)).not.toHaveProperty('id');
      request.flush({ isSucceeded: true, message: 'Saved', data: { id: 25 } });
      expect(close).toHaveBeenCalledWith(true);
    });
  }

  it('keeps the persisted ID, PUT route and local calendar dates while editing', async () => {
    const dialog = create(AcademicMasterType.Session, {
      id: 25,
      code: 'AY-2028-29',
      name: 'Academic Year 2028-29',
      isActive: true,
      type: 1,
      startDate: '2028-04-01T00:00:00',
      endDate: '2029-03-31',
    });

    dialog.save();
    await Promise.resolve();

    const request = http.expectOne((req) => req.url.endsWith('/masters/Session/25'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(
      expect.objectContaining({ id: 25, startDate: '2028-04-01', endDate: '2029-03-31' }),
    );
    request.flush({ isSucceeded: true, message: 'Updated', data: { id: 25 } });
  });

  it('does not save a session that ends before it starts', async () => {
    const dialog = create(AcademicMasterType.Session);
    dialog.model.update((value) => ({
      ...value,
      code: 'AY',
      name: 'Year',
      startDate: new Date(2028, 3, 1),
      endDate: new Date(2028, 2, 1),
    }));

    dialog.save();
    await Promise.resolve();

    http.expectNone(() => true);
    expect(close).not.toHaveBeenCalled();
  });

  it('does not save a negative section capacity', async () => {
    const dialog = create(AcademicMasterType.Section);
    dialog.model.update((value) => ({ ...value, code: 'A', name: 'Section A', capacity: -1 }));

    dialog.save();
    await Promise.resolve();

    http.expectNone(() => true);
  });
});
