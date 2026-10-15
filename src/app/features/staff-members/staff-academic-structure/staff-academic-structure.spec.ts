import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi } from '@core/services';
import { AcademicMaster } from '@shared/interfaces';

import StaffAcademicStructure from './staff-academic-structure';

describe('StaffAcademicStructure', () => {
  const session = {
    id: 3,
    code: 'AY-2026-27',
    name: '<img src=x onerror=alert(1)>',
    description: '',
    isActive: true,
  } as AcademicMaster;

  let component: StaffAcademicStructure;
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let deleteMaster: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const empty = of({ isSucceeded: true, message: '', data: [] });
    deleteMaster = vi.fn(() => of({ isSucceeded: true, message: 'Deactivated', data: true }));
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        {
          provide: Common,
          useValue: { setPageHeaderInfo: vi.fn(), showMessage: vi.fn() },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } },
        },
        {
          provide: StaffAcademicStructureApi,
          useValue: {
            getMasters: vi.fn(() => empty),
            getTeachingAssignmentTypes: vi.fn(() => empty),
            deleteMaster,
          },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new StaffAcademicStructure());
    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  });

  afterEach(() => vi.useRealTimers());

  it('asks for confirmation before deactivating and calls the API only on accept', () => {
    component.confirmDeactivate(session);

    expect(deleteMaster).not.toHaveBeenCalled();
    const options = confirmSpy.mock.calls[0][0] as Confirmation;
    expect(options.acceptButtonStyleClass).toBe('p-button-danger');
    options.accept?.();
    expect(deleteMaster).toHaveBeenCalledWith(component.selectedTab(), 3);
  });

  it('escapes the record name in the confirmation message', () => {
    component.confirmDeactivate(session);

    expect((confirmSpy.mock.calls[0][0] as Confirmation).message).toBe(
      'Deactivate <strong>&lt;img src=x onerror=alert(1)&gt;</strong>?',
    );
  });

  it('defaults effective-from to the local calendar day, not the UTC day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 1, 0));

    expect(component.emptyTeaching().effectiveFrom).toBe('2026-10-17');
    expect(component.emptyClassTeacher().effectiveFrom).toBe('2026-10-17');
  });

  it('resets the master form on cancel', () => {
    component.masterForm = { ...session };

    component.resetMaster();

    expect(component.masterForm).toEqual({
      id: 0,
      code: '',
      name: '',
      description: '',
      isActive: true,
      type: 1,
    });
  });
});
