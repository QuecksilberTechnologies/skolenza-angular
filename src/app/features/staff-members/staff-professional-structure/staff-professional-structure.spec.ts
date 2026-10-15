import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { LookupStore } from '@core/stores';
import { StaffProfessionalMaster } from '@shared/interfaces';

import StaffProfessionalStructure, { buildDependencyOptions } from './staff-professional-structure';

describe('StaffProfessionalStructure dependency options', () => {
  const values = [
    { id: 1, name: 'Teaching Staff', isActive: true },
    { id: 2, name: 'Head Mistress', isActive: false },
    { id: 3, name: 'Student Services', isActive: true },
  ];

  it('excludes inactive dependencies while adding a new record', () => {
    const options = buildDependencyOptions(values, new Set<number>());

    expect(options.map((item) => item.name)).toEqual(['Teaching Staff', 'Student Services']);
    expect(options.every((item) => !item.disabled)).toBe(true);
  });

  it('keeps an already selected inactive dependency visible and disabled while editing', () => {
    const options = buildDependencyOptions(values, new Set([2]));
    const inactiveSelection = options.find((item) => item.id === 2);

    expect(inactiveSelection).toEqual({
      id: 2,
      name: 'Head Mistress',
      isActive: false,
      disabled: true,
    });
  });

  it('keeps active selected dependencies enabled', () => {
    const options = buildDependencyOptions(values, new Set([1]));

    expect(options.find((item) => item.id === 1)?.disabled).toBe(false);
  });
});

describe('StaffProfessionalStructure status confirmation', () => {
  const master = {
    id: 7,
    code: 'LIBRARY',
    name: '<img src=x onerror=alert(1)>',
    description: '',
    isActive: true,
  } as StaffProfessionalMaster;

  let component: StaffProfessionalStructure;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const empty = of({ isSucceeded: true, message: '', data: [] });
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
        { provide: LookupStore, useValue: { staffCategories: signal([]) } },
        {
          provide: StaffProfessionalStructureApi,
          useValue: {
            getMasters: vi.fn(() => empty),
            getCategories: vi.fn(() => empty),
            getPositions: vi.fn(() => empty),
          },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new StaffProfessionalStructure());
    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
  });

  it('uses a danger accept button and escapes the name when deactivating', () => {
    component.confirmMasterActive(master);

    const options = confirmSpy.mock.calls[0][0] as Confirmation;
    expect(options.acceptButtonStyleClass).toBe('p-button-danger');
    expect(options.message).toBe(
      'Deactivate <strong>&lt;img src=x onerror=alert(1)&gt;</strong>? It will no longer be available for new dependent selections.',
    );
  });

  it('uses a primary accept button when activating', () => {
    component.confirmMasterActive({ ...master, isActive: false });

    expect((confirmSpy.mock.calls[0][0] as Confirmation).acceptButtonStyleClass).toBe(
      'p-button-primary',
    );
  });
});
