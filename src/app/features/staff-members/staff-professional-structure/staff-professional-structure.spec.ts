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

  it('names the tab in the empty state', () => {
    expect(component.emptyMessage(0)).toBe('No job families yet');
    expect(component.emptyDetail(0)).toBe('Job families appear here once added.');
  });

  it('points at the status filter when it hides every row', () => {
    component.statusFilter = 'inactive';

    expect(component.emptyMessage(2)).toBe('No inactive job families');
    expect(component.emptyDetail(2)).toBe('Change the status filter to see all job families.');
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

/** Routing tests drive `paramMap` by hand and spy on `navigate`. */
function setupRouting() {
  const empty = of({ isSucceeded: true, message: '', errors: [], data: [] });
  const route = { paramMap: new Subject<ReturnType<typeof convertToParamMap>>() };
  const api = {
    getCategories: vi.fn(() => empty),
    getPositions: vi.fn(() => empty),
    getMasters: vi.fn(() => empty),
  };
  TestBed.configureTestingModule({
    imports: [StaffProfessionalStructure],
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
      { provide: StaffProfessionalStructureApi, useValue: api },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { api, navigate, route };
}

describe('StaffProfessionalStructure tab routing', () => {
  let ctx: ReturnType<typeof setupRouting>;
  let component: StaffProfessionalStructure;

  beforeEach(() => {
    ctx = setupRouting();
    component = TestBed.runInInjectionContext(() => new StaffProfessionalStructure());
    component.ngOnInit();
  });

  it('selects and loads the tab named in the URL', () => {
    ctx.route.paramMap.next(convertToParamMap({ tab: 'positions' }));

    expect(component.selectedTab()).toBe('positions');
    expect(ctx.api.getPositions).toHaveBeenCalledWith(undefined, false);

    ctx.route.paramMap.next(convertToParamMap({ tab: 'duties' }));

    expect(component.selectedTab()).toBe(StaffProfessionalMasterType.DutyDefinition);
    expect(ctx.api.getMasters).toHaveBeenLastCalledWith(
      StaffProfessionalMasterType.DutyDefinition,
      false,
    );
  });

  it('refreshes the central categories when entering the workspace after Host changes', () => {
    expect(TestBed.inject(LookupStore).reloadStaffCategories).toHaveBeenCalledOnce();
  });

  it('replaces an unknown tab segment with job-families', () => {
    ctx.route.paramMap.next(convertToParamMap({ tab: 'nope' }));

    expect(ctx.navigate).toHaveBeenCalledWith(['..', 'job-families'], {
      relativeTo: ctx.route,
      replaceUrl: true,
    });
  });
});

describe('StaffProfessionalStructure tab bar', () => {
  async function render() {
    const ctx = setupRouting();
    const fixture = TestBed.createComponent(StaffProfessionalStructure);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const show = async (tab: string) => {
      ctx.route.paramMap.next(convertToParamMap({ tab }));
      await fixture.whenStable();
    };
    const tab = (label: string) =>
      [...root.querySelectorAll<HTMLElement>('[role="tab"]')].find(
        (item) => item.textContent?.trim() === label,
      );
    const selectedTabs = () =>
      [...root.querySelectorAll('[role="tab"][aria-selected="true"]')].map((item) =>
        item.textContent?.trim(),
      );
    return { ...ctx, fixture, root, show, tab, selectedTabs };
  }

  it('moves the selected tab with the route and labels the panel with it', async () => {
    const { root, show, selectedTabs } = await render();

    await show('positions');
    expect(selectedTabs()).toEqual(['Positions']);

    await show('staff-categories');
    expect(selectedTabs()).toEqual(['Staff Categories']);

    const panel = root.querySelector('[role="tabpanel"]');
    const selected = root.querySelector('[role="tab"][aria-selected="true"]');
    expect(panel?.getAttribute('aria-labelledby')).toBe(selected?.id);
    expect(selected?.getAttribute('aria-controls')).toBe(panel?.id);
    expect(root.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Professional structure sections',
    );
  });

  it('navigates to the clicked tab and keeps the panel visible meanwhile', async () => {
    const { fixture, navigate, route, root, show, tab } = await render();
    await show('job-families');

    tab('Staff Categories')?.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['..', 'staff-categories'], { relativeTo: route });
    expect(root.querySelector<HTMLElement>('[role="tabpanel"]')?.hidden).toBe(false);
  });
});
