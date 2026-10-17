import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffProfessionalStructureApi } from '@core/services';
import { FeaturePageStore, LookupStore } from '@core/stores';
import {
  ApiDataResponse,
  StaffProfessionalMaster,
  StaffProfessionalMasterType,
} from '@shared/interfaces';
import { buildDependencyOptions } from '@shared/utilities/dependency-options';

import { ProfessionalMasterDialog } from './professional-master-dialog/professional-master-dialog';
import StaffProfessionalStructure from './staff-professional-structure';

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
  let denied: Set<string>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const empty = of({ isSucceeded: true, message: '', data: [] });
    denied = new Set();
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        DialogService,
        {
          provide: FeaturePageStore,
          useValue: {
            canPerformOrUnknown: (_module: string, operation: string) => !denied.has(operation),
          },
        },
        provideRouter([]),
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        {
          provide: LookupStore,
          useValue: { staffCategories: signal([]), reloadStaffCategories: vi.fn() },
        },
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

  it('opens the add dialog for the current tab', () => {
    const open = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);

    component.openAdd();

    expect(open).toHaveBeenCalledWith(
      ProfessionalMasterDialog,
      expect.objectContaining({
        header: 'Add Job Family',
        data: { type: StaffProfessionalMasterType.JobFamily, master: undefined },
      }),
    );
  });

  it('keeps Deactivate out of the row menu without Delete permission', () => {
    denied.add('Delete');

    const items = component.masterActions(master);

    expect(items.find((item) => item.label === 'Edit')?.visible).toBe(true);
    expect(items.find((item) => item.label === 'Deactivate')?.visible).toBe(false);
  });

  it('hides the row menu when no action in it is permitted', () => {
    denied.add('Update');
    denied.add('Delete');

    expect(component.hasRowActions(true, component.canDelete())).toBe(false);
  });

  it('names the tab and the next step in the empty state', () => {
    expect(component.emptyMessage(0)).toBe(
      'No job families yet. Use Add Job Family to create one.',
    );
  });

  it('drops the add hint from the empty state without Add permission', () => {
    denied.add('Add');
    expect(component.emptyMessage(0)).toBe('No job families yet.');
  });

  it('uses a primary accept button when activating', () => {
    component.confirmMasterActive({ ...master, isActive: false });

    expect((confirmSpy.mock.calls[0][0] as Confirmation).acceptButtonStyleClass).toBe(
      'p-button-primary',
    );
  });
});

describe('StaffProfessionalStructure busy state', () => {
  it('shows list shimmer while the first load is pending, then the rows', async () => {
    const pending = new Subject<ApiDataResponse<StaffProfessionalMaster[]>>();
    const empty = of({ isSucceeded: true, message: '', data: [] });
    TestBed.configureTestingModule({
      imports: [StaffProfessionalStructure],
      providers: [
        ConfirmationService,
        DialogService,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ tab: 'job-families' })) },
        },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        {
          provide: LookupStore,
          useValue: { staffCategories: signal([]), reloadStaffCategories: vi.fn() },
        },
        {
          provide: StaffProfessionalStructureApi,
          useValue: {
            getCategories: vi.fn(() => empty),
            getPositions: vi.fn(() => empty),
            getMasters: vi.fn((_type: unknown, _activeOnly: boolean) => pending),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(StaffProfessionalStructure);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-list-skeleton [role="status"]')).not.toBeNull();

    pending.next({
      isSucceeded: true,
      message: '',
      errors: [],
      data: [
        { id: 1, code: 'LIBRARY', name: 'Library', isActive: true } as StaffProfessionalMaster,
      ],
    });
    pending.complete();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(root.querySelector('app-list-skeleton')).toBeNull();
    expect(root.textContent).toContain('Library');
  });
});

describe('StaffProfessionalStructure tab loading', () => {
  it('ignores a late response from the previous tab and keeps lookups off the list skeleton', () => {
    const lookups = new Subject<ApiDataResponse<StaffProfessionalMaster[]>>();
    const jobFamilies = new Subject<ApiDataResponse<StaffProfessionalMaster[]>>();
    const capabilities = new Subject<ApiDataResponse<StaffProfessionalMaster[]>>();
    const empty = of({ isSucceeded: true, message: '', errors: [], data: [] });
    const getMasters = vi
      .fn()
      .mockReturnValueOnce(jobFamilies) // loadSelected: Job Families
      .mockReturnValue(lookups); // reference lookups
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        DialogService,
        provideRouter([]),
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        {
          provide: LookupStore,
          useValue: { staffCategories: signal([]), reloadStaffCategories: vi.fn() },
        },
        {
          provide: StaffProfessionalStructureApi,
          useValue: {
            getCategories: vi.fn(() => empty),
            getPositions: vi.fn(() => empty),
            getMasters,
          },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new StaffProfessionalStructure());
    const row = (name: string) =>
      ({
        isSucceeded: true,
        message: '',
        errors: [],
        data: [{ id: 1, name, isActive: true } as StaffProfessionalMaster],
      }) as ApiDataResponse<StaffProfessionalMaster[]>;

    component.loadSelected();
    getMasters.mockReturnValueOnce(capabilities);
    component.selectTab(StaffProfessionalMasterType.Capability);
    capabilities.next(row('Lesson planning'));
    capabilities.complete();
    jobFamilies.next(row('Library'));

    expect(component.masters().map((item) => item.name)).toEqual(['Lesson planning']);
    // Reference lookups are still pending, but they do not count as the list loading.
    expect(component.loading()).toBe(false);
    lookups.complete();
  });
});

describe('StaffProfessionalStructure tab routing', () => {
  const empty = of({ isSucceeded: true, message: '', errors: [], data: [] });
  let route: { paramMap: Subject<ReturnType<typeof convertToParamMap>> };
  let getMasters: ReturnType<typeof vi.fn>;
  let getPositions: ReturnType<typeof vi.fn>;
  let component: StaffProfessionalStructure;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    route = { paramMap: new Subject() };
    getMasters = vi.fn(() => empty);
    getPositions = vi.fn(() => empty);
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        DialogService,
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        {
          provide: LookupStore,
          useValue: { staffCategories: signal([]), reloadStaffCategories: vi.fn() },
        },
        {
          provide: StaffProfessionalStructureApi,
          useValue: {
            getCategories: vi.fn(() => empty),
            getPositions,
            getMasters,
          },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new StaffProfessionalStructure());
    component.ngOnInit();
  });

  it('selects and loads the tab named in the URL', () => {
    route.paramMap.next(convertToParamMap({ tab: 'positions' }));

    expect(component.selectedTab()).toBe('positions');
    expect(getPositions).toHaveBeenCalledWith(undefined, false);

    route.paramMap.next(convertToParamMap({ tab: 'duties' }));

    expect(component.selectedTab()).toBe(StaffProfessionalMasterType.DutyDefinition);
    expect(getMasters).toHaveBeenLastCalledWith(StaffProfessionalMasterType.DutyDefinition, false);
  });

  it('refreshes the central categories when entering the workspace after Host changes', () => {
    expect(TestBed.inject(LookupStore).reloadStaffCategories).toHaveBeenCalledOnce();
  });

  it('replaces an unknown tab segment with job-families', () => {
    route.paramMap.next(convertToParamMap({ tab: 'nope' }));

    expect(navigate).toHaveBeenCalledWith(['..', 'job-families'], {
      relativeTo: route,
      replaceUrl: true,
    });
  });

  it('navigates to the clicked tab instead of switching in place', () => {
    route.paramMap.next(convertToParamMap({ tab: 'job-families' }));
    component.openTab('categories');

    expect(navigate).toHaveBeenCalledWith(['..', 'staff-categories'], {
      relativeTo: route,
    });
    expect(component.selectedTab()).toBe(StaffProfessionalMasterType.JobFamily);
  });
});
