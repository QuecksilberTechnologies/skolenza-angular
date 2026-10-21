import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { Confirmation, ConfirmationService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi, StaffCurriculumDeliveryApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  AcademicMasterType,
  CurriculumFramework,
  CurriculumTopic,
  CurriculumUnit,
  LessonPlan,
  StaffTeachingAssignment,
} from '@shared/interfaces';

import { CurriculumFrameworkDialog } from './curriculum-framework-dialog/curriculum-framework-dialog';
import { LessonDeliveryDialog } from './lesson-delivery-dialog/lesson-delivery-dialog';
import { LessonPlanDialog } from './lesson-plan-dialog/lesson-plan-dialog';
import StaffCurriculumDelivery, { unitIdsForTeachingAssignment } from './staff-curriculum-delivery';

const STATUSES = [
  { id: 1, code: 'DRAFT', name: 'Draft' },
  { id: 2, code: 'SUBMITTED', name: 'Submitted' },
  { id: 3, code: 'APPROVED', name: 'Approved' },
  { id: 4, code: 'REJECTED', name: 'Rejected' },
];

describe('StaffCurriculumDelivery topic selection', () => {
  it('picks only the units of the selected teaching assignment course offering', () => {
    const units = [
      { id: 1, courseOfferingId: 11 },
      { id: 2, courseOfferingId: 22 },
      { id: 3, courseOfferingId: 11 },
    ] as CurriculumUnit[];
    const assignments = [
      { id: 7, courseOfferingId: 11 },
      { id: 8, courseOfferingId: 22 },
    ] as StaffTeachingAssignment[];

    expect(unitIdsForTeachingAssignment(units, assignments, 7)).toEqual([1, 3]);
  });

  it('picks no units until a valid teaching assignment is selected', () => {
    expect(unitIdsForTeachingAssignment([], [], null)).toEqual([]);
  });
});

describe('StaffCurriculumDelivery', () => {
  // Every API method answers with an empty successful list, unless a test assigns its own.
  const emptyApi = () =>
    new Proxy<Record<string, unknown>>(
      {},
      {
        get: (target, key: string) =>
          target[key] ?? vi.fn(() => of({ isSucceeded: true, message: '', data: [] })),
      },
    );

  let component: StaffCurriculumDelivery;
  let denied: Set<string>;
  let paramMap: BehaviorSubject<ParamMap>;
  let navigate: ReturnType<typeof vi.spyOn>;
  let route: ActivatedRoute;

  beforeEach(() => {
    denied = new Set();
    paramMap = new BehaviorSubject(convertToParamMap({ tab: 'frameworks' }));
    route = { paramMap } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        DialogService,
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        {
          provide: FeaturePageStore,
          useValue: {
            canPerformOrUnknown: (_module: string, operation: string) => !denied.has(operation),
          },
        },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        { provide: StaffCurriculumDeliveryApi, useValue: emptyApi() },
        { provide: StaffAcademicStructureApi, useValue: emptyApi() },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component = TestBed.runInInjectionContext(() => new StaffCurriculumDelivery());
    component.statuses.set(STATUSES);
  });

  const framework = (workflowStatusId: number) =>
    ({ id: 9, name: 'Framework 2026', workflowStatusId }) as CurriculumFramework;
  const labels = (items: { label?: string; visible?: boolean }[]) =>
    items.filter((item) => item.visible !== false).map((item) => item.label);

  it('shows a breadcrumb back to the Staff Directory', () => {
    component.ngOnInit();

    expect(TestBed.inject(Common).setBreadcrumbItems).toHaveBeenCalledWith([
      { label: 'Staff Directory', routerLink: '/app/staff' },
      { label: 'Curriculum & Lesson Delivery' },
    ]);
  });

  it('selects the tab named in the URL and replaces an unknown one with frameworks', () => {
    component.ngOnInit();
    paramMap.next(convertToParamMap({ tab: 'delivery-logs' }));
    expect(component.selectedTab()).toBe('delivery-logs');

    paramMap.next(convertToParamMap({ tab: 'nope' }));
    expect(navigate).toHaveBeenCalledWith(['..', 'frameworks'], {
      relativeTo: route,
      replaceUrl: true,
    });
  });

  it('navigates to the clicked tab instead of switching in place', () => {
    component.ngOnInit();
    component.openTab('lesson-plans');

    expect(navigate).toHaveBeenCalledWith(['..', 'lesson-plans'], { relativeTo: route });
    expect(component.selectedTab()).toBe('frameworks');
  });

  it('offers the workflow actions that fit each state', () => {
    expect(labels(component.frameworkActions(framework(1)))).toEqual(['Edit', 'Submit', 'Delete']);
    expect(labels(component.frameworkActions(framework(4)))).toEqual(['Edit', 'Submit', 'Delete']);
    expect(labels(component.frameworkActions(framework(2)))).toEqual(['Approve', 'Reject']);
    expect(component.hasActions(component.frameworkActions(framework(3)))).toBe(false);
    expect(
      labels(component.planActions({ id: 5, workflowStatusId: 3 } as unknown as LessonPlan)),
    ).toEqual(['Record Delivery']);
  });

  it('hides actions the permission matrix withholds', () => {
    denied.add('Delete');
    denied.add('Update');

    expect(component.hasActions(component.frameworkActions(framework(1)))).toBe(false);
    expect(component.hasActions(component.frameworkActions(framework(2)))).toBe(false);
  });

  it('opens the framework dialog with the matching header', () => {
    const open = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);

    component.openFrameworkDialog();

    expect(open).toHaveBeenCalledWith(
      CurriculumFrameworkDialog,
      expect.objectContaining({ header: 'Add Curriculum Framework' }),
    );
  });

  it('records a delivery against an approved plan from the plan menu', () => {
    const open = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);
    const plan = { id: 5, workflowStatusId: 3, topics: [] } as unknown as LessonPlan;
    const draft = { id: 6, workflowStatusId: 1, topics: [] } as unknown as LessonPlan;
    Object.assign(TestBed.inject(StaffCurriculumDeliveryApi), {
      getLessonPlans: vi.fn(() =>
        of({ isSucceeded: true, message: '', data: [plan, draft], totalPages: 1 }),
      ),
    });

    component.planActions(plan)[0].command?.({});

    expect(open).toHaveBeenCalledWith(
      LessonDeliveryDialog,
      expect.objectContaining({
        header: 'Record Lesson Delivery',
        data: expect.objectContaining({
          lessonPlanId: 5,
          approvedPlans: [plan],
          plans: [plan, draft],
        }),
      }),
    );
  });

  it('switches to Delivery Logs after recording a delivery from a plan', () => {
    const onClose = new Subject<boolean | undefined>();
    vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({
      onClose,
      close: vi.fn(),
    } as unknown as ReturnType<DialogService['open']>);
    paramMap.next(convertToParamMap({ tab: 'lesson-plans' }));

    component.openDeliveryDialog(undefined, 5);
    onClose.next(true);

    expect(navigate).toHaveBeenCalledWith(['..', 'delivery-logs'], { relativeTo: route });
  });

  it('keeps the current framework when the picker emits null', () => {
    component.selectFramework(4);

    component.selectFramework(null);

    expect(component.selectedFrameworkId()).toBe(4);
  });

  it('escapes the record label in the delete confirmation', () => {
    const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');

    component.confirmDelete('frameworks', 1, '<img src=x onerror=alert(1)>');

    expect((confirm.mock.calls[0][0] as Confirmation).message).toBe(
      'Delete "&lt;img src=x onerror=alert(1)&gt;"? Records already in use must be removed first.',
    );
  });
});

describe('StaffCurriculumDelivery tab requests', () => {
  const ok = (data: unknown[] = [], totalPages = 1) =>
    of({ isSucceeded: true, message: '', data, totalPages });
  const firstPage = { pageNumber: 1, pageSize: 10 };
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let academicApi: { getMasters: ReturnType<typeof vi.fn> };
  let paramMap: BehaviorSubject<ParamMap>;
  let component: StaffCurriculumDelivery;

  beforeEach(() => {
    const methods = [
      'getStatuses',
      'getFrameworks',
      'getUnits',
      'getTopics',
      'getLessonPlans',
      'getDeliveries',
      'getProgress',
      'getTeachingAssignments',
    ];
    api = Object.fromEntries(methods.map((name) => [name, vi.fn(() => ok())]));
    api['getFrameworks'] = vi.fn(() => ok([{ id: 9, name: 'Framework 2026' }]));
    academicApi = { getMasters: vi.fn(() => ok()) };
    paramMap = new BehaviorSubject(convertToParamMap({ tab: 'frameworks' }));
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        DialogService,
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap } },
        { provide: FeaturePageStore, useValue: { canPerformOrUnknown: () => true } },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        { provide: StaffCurriculumDeliveryApi, useValue: api },
        { provide: StaffAcademicStructureApi, useValue: academicApi },
      ],
    });
    component = TestBed.runInInjectionContext(() => new StaffCurriculumDelivery());
  });

  const called = () => Object.keys(api).filter((name) => api[name].mock.calls.length);

  it('fetches only the first frameworks page and statuses on the Frameworks tab', () => {
    component.ngOnInit();

    expect(called()).toEqual(['getStatuses', 'getFrameworks']);
    expect(api['getFrameworks']).toHaveBeenCalledWith(firstPage);
    expect(academicApi.getMasters).not.toHaveBeenCalled();
  });

  it('appends the next frameworks page on Load more', () => {
    api['getFrameworks'] = vi.fn(({ pageNumber }: { pageNumber: number }) =>
      ok([{ id: pageNumber, name: `Framework ${pageNumber}` }], 2),
    );
    component.ngOnInit();
    expect(component.frameworks.hasMore()).toBe(true);

    component.frameworks.loadMore();

    expect(api['getFrameworks']).toHaveBeenLastCalledWith({ pageNumber: 2, pageSize: 10 });
    expect(component.frameworks.items().map((item) => item.id)).toEqual([1, 2]);
    expect(component.frameworks.hasMore()).toBe(false);
  });

  it('fetches only syllabus progress on the Syllabus Progress tab', () => {
    paramMap.next(convertToParamMap({ tab: 'syllabus-progress' }));
    component.ngOnInit();

    expect(called()).toEqual(['getProgress']);
  });

  it('fetches every framework for the picker and the first units page on Units & Topics', () => {
    api['getFrameworks'] = vi.fn(({ pageNumber }: { pageNumber: number }) =>
      ok([{ id: pageNumber + 8, name: `Framework ${pageNumber}` }], 2),
    );
    paramMap.next(convertToParamMap({ tab: 'units-topics' }));
    component.ngOnInit();

    expect(called()).toEqual(['getFrameworks', 'getUnits']);
    expect(component.frameworkOptions().map((item) => item.id)).toEqual([9, 10]);
    expect(api['getUnits']).toHaveBeenCalledWith(9, firstPage);
  });

  it('pages each unit topics on their own', () => {
    api['getUnits'] = vi.fn(() => ok([{ id: 1, name: 'Digital Foundations' }]));
    api['getTopics'] = vi.fn((_unitId: number, { pageNumber }: { pageNumber: number }) =>
      ok([{ id: pageNumber, name: `Topic ${pageNumber}` }], 2),
    );
    paramMap.next(convertToParamMap({ tab: 'units-topics' }));
    component.ngOnInit();

    expect(api['getTopics']).toHaveBeenCalledWith(1, firstPage);
    const topics = component.topicsOf(1)!;
    topics.loadMore();

    expect(api['getTopics']).toHaveBeenLastCalledWith(1, { pageNumber: 2, pageSize: 10 });
    expect(topics.items().map((topic) => topic.id)).toEqual([1, 2]);
  });

  it('flattens units and topics into rows, with a loading row where a list has more', () => {
    api['getUnits'] = vi.fn(() => ok([{ id: 1, name: 'Digital Foundations' }], 2));
    api['getTopics'] = vi.fn(() => ok([{ id: 7, name: 'Devices' }], 2));
    paramMap.next(convertToParamMap({ tab: 'units-topics' }));
    component.ngOnInit();

    expect(component.unitRows().map((row) => row.key)).toEqual([
      'unit-1',
      'topic-7',
      'topics-1',
      'units',
    ]);
  });

  it('loads the next page behind each loading row in the rendered range only', () => {
    api['getUnits'] = vi.fn(() => ok([{ id: 1, name: 'Digital Foundations' }], 2));
    api['getTopics'] = vi.fn(() => ok([{ id: 7, name: 'Devices' }], 2));
    paramMap.next(convertToParamMap({ tab: 'units-topics' }));
    component.ngOnInit();

    // Rows: unit-1, topic-7, topics-1, units. Rendering up to the topics row loads topics only.
    component.loadRendered({ start: 0, end: 3 });

    expect(api['getTopics']).toHaveBeenLastCalledWith(1, { pageNumber: 2, pageSize: 10 });
    expect(api['getUnits']).toHaveBeenCalledTimes(1);
  });

  it('holds back the next units page until the loaded units have their topics', () => {
    const topics = new Subject<{
      isSucceeded: boolean;
      message: string;
      data: [];
      totalPages: number;
    }>();
    api['getUnits'] = vi.fn(() => ok([{ id: 1, name: 'Digital Foundations' }], 2));
    api['getTopics'] = vi.fn(() => topics);
    paramMap.next(convertToParamMap({ tab: 'units-topics' }));
    component.ngOnInit();
    expect(component.unitRows().map((row) => row.key)).toEqual(['unit-1']);

    topics.next({ isSucceeded: true, message: '', data: [], totalPages: 1 });
    topics.complete();

    expect(component.unitRows().map((row) => row.key)).toEqual(['unit-1', 'units']);
  });

  it('does not ask for a page that is already on its way', () => {
    const pending = new Subject<never>();
    api['getUnits'] = vi.fn(() => ok([], 2));
    paramMap.next(convertToParamMap({ tab: 'units-topics' }));
    component.ngOnInit();
    api['getUnits'].mockReturnValue(pending);

    component.loadRendered({ start: 0, end: 1 });
    component.loadRendered({ start: 0, end: 1 });

    expect(api['getUnits']).toHaveBeenCalledTimes(2);
  });

  it('gives the lesson plan dialog every unit of the picked framework', () => {
    const open = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);
    api['getUnits'] = vi.fn(() => ok([{ id: 1, name: 'Digital Foundations' }]));
    paramMap.next(convertToParamMap({ tab: 'lesson-plans' }));
    component.ngOnInit();
    expect(api['getUnits']).not.toHaveBeenCalled();

    component.openPlanDialog();

    expect(api['getUnits']).toHaveBeenCalledWith(9, { pageNumber: 1, pageSize: 100 });
    expect(open).toHaveBeenCalledWith(
      LessonPlanDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          units: [{ id: 1, name: 'Digital Foundations' }],
        }),
      }),
    );
  });

  it('fetches every lesson plan to title the delivery rows', () => {
    api['getLessonPlans'] = vi.fn(({ pageNumber }: { pageNumber: number }) =>
      ok(
        [{ id: pageNumber, courseOfferingName: 'Maths', plannedDate: `2026-10-0${pageNumber}` }],
        2,
      ),
    );
    paramMap.next(convertToParamMap({ tab: 'delivery-logs' }));
    component.ngOnInit();

    expect(api['getDeliveries']).toHaveBeenCalledWith(firstPage);
    expect(component.planLookup().map((plan) => plan.id)).toEqual([1, 2]);
  });

  it('opens the delivery dialog from the plans Delivery Logs already holds', () => {
    vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);
    paramMap.next(convertToParamMap({ tab: 'delivery-logs' }));
    api['getLessonPlans'] = vi.fn(() => ok([{ id: 5, workflowStatusId: 3 }]));
    component.ngOnInit();

    component.openDeliveryDialog();

    expect(api['getLessonPlans']).toHaveBeenCalledOnce();
  });

  describe('Units & Topics', () => {
    // Two pages: unit 1, then unit 2 (11 records); a merged refresh returns both. Each unit has
    // one page of topics.
    const unitPages = (
      _frameworkId: number,
      { pageNumber, pageSize }: { pageNumber: number; pageSize: number },
    ) =>
      of({
        isSucceeded: true,
        message: '',
        data: pageSize > 10 ? [{ id: 1 }, { id: 2 }] : [{ id: pageNumber }],
        totalRecords: 11,
      });
    const open = () => {
      api['getUnits'] = vi.fn(unitPages);
      api['getTopics'] = vi.fn((unitId: number) =>
        ok([{ id: unitId * 10, curriculumUnitId: unitId }]),
      );
      api['deleteRecord'] = vi.fn(() => of({ isSucceeded: true, message: 'Deleted', data: true }));
      vi.spyOn(TestBed.inject(ConfirmationService), 'confirm').mockImplementation(
        (confirmation: Confirmation) => {
          confirmation.accept?.();
          return TestBed.inject(ConfirmationService);
        },
      );
      paramMap.next(convertToParamMap({ tab: 'units-topics' }));
      component.ngOnInit();
    };

    it('stops asking for a page that failed until Retry', () => {
      open();
      api['getUnits'] = vi.fn(() => throwError(() => new Error('Server error')));

      component.loadRendered({ start: 0, end: 10 });
      component.loadRendered({ start: 0, end: 10 });

      expect(api['getUnits']).toHaveBeenCalledOnce();
      expect(component.unitRows().at(-1)).toMatchObject({ kind: 'more', what: 'more units' });
      expect(TestBed.inject(Common).showMessage).toHaveBeenCalledWith('Server error', 'error');
    });

    it('refreshes only the unit a deleted topic sat in', () => {
      open();
      component.units.loadMore();
      api['getTopics'].mockClear();

      component
        .topicActions({ id: 10, curriculumUnitId: 1, name: 'Devices' } as CurriculumTopic)
        .find((item) => item.label === 'Delete')
        ?.command?.({});

      expect(api['getTopics'].mock.calls).toEqual([[1, { pageNumber: 1, pageSize: 10 }]]);
      expect(api['getUnits']).toHaveBeenCalledTimes(2);
    });

    it('refreshes the loaded units in place after a unit delete and drops the deleted unit topics', () => {
      open();
      component.units.loadMore();
      api['getTopics'].mockClear();
      api['getUnits'] = vi.fn(() => ok([{ id: 1 }], 1));

      component.confirmDelete('units', 2, 'Unit 2');

      expect(api['getUnits']).toHaveBeenCalledWith(9, { pageNumber: 1, pageSize: 20 });
      expect(api['getTopics']).not.toHaveBeenCalled();
      expect(component.topicsOf(2)).toBeUndefined();
      expect(component.units.items()).toEqual([{ id: 1 }]);
    });

    it('fetches the units for the topic picker once per framework', () => {
      vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);
      open();
      api['getUnits'].mockClear();

      component.openTopicDialog();
      component.openTopicDialog();

      expect(api['getUnits']).toHaveBeenCalledOnce();
    });
    it('keeps a Retry row for a unit whose first topics page failed', () => {
      api['getTopics'] = vi.fn(() => throwError(() => new Error('Server error')));
      api['getUnits'] = vi.fn(() => ok([{ id: 1, name: 'Digital Foundations' }]));
      paramMap.next(convertToParamMap({ tab: 'units-topics' }));
      component.ngOnInit();

      expect(component.unitRows().map((row) => row.key)).toEqual(['unit-1', 'topics-1']);
      expect(component.unitsStatus()).toBe("Some units or topics couldn't load.");
    });

    it('runs at most 4 topic requests at once and toasts once when they all fail', () => {
      const pending = Array.from({ length: 6 }, () => new Subject<never>());
      api['getTopics'] = vi.fn((unitId: number) => pending[unitId - 1]);
      api['getUnits'] = vi.fn(() =>
        ok(Array.from({ length: 6 }, (_, index) => ({ id: index + 1, name: `Unit ${index + 1}` }))),
      );
      paramMap.next(convertToParamMap({ tab: 'units-topics' }));
      component.ngOnInit();
      // A request goes out when it is subscribed; the limiter holds back the last two.
      expect(pending.filter((request) => request.observed)).toHaveLength(4);

      pending.forEach((request) => request.error(new Error('Server error')));

      expect(pending.every((request) => !request.observed)).toBe(true);
      // The held-back requests ran once slots freed up, and failed with the rest.
      expect(component.topicsOf(6)?.failed()).toBe(true);
      expect(TestBed.inject(Common).showMessage).toHaveBeenCalledOnce();
    });
  });

  it('lets only the latest framework list load reset the units', () => {
    const first = new Subject<{ isSucceeded: boolean; message: string; data: unknown[] }>();
    api['getFrameworks'] = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValue(ok([{ id: 9 }]));
    paramMap.next(convertToParamMap({ tab: 'units-topics' }));
    component.ngOnInit();
    component.selectTab('units-topics');
    api['getUnits'].mockClear();

    first.next({ isSucceeded: true, message: '', data: [{ id: 9 }] });
    first.complete();

    expect(api['getUnits']).not.toHaveBeenCalled();
    expect(first.observed).toBe(false);
  });

  it('shows the error when the framework list fails to load', () => {
    api['getFrameworks'] = vi.fn(() => throwError(() => new Error('Server error')));
    paramMap.next(convertToParamMap({ tab: 'units-topics' }));
    component.ngOnInit();

    expect(TestBed.inject(Common).showMessage).toHaveBeenCalledWith('Server error', 'error');
  });

  it('fetches sessions only when the framework dialog opens', () => {
    vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue(null);

    component.openFrameworkDialog();

    expect(academicApi.getMasters.mock.calls).toEqual([
      [AcademicMasterType.Session, expect.objectContaining({ pageNumber: 1 })],
    ]);
  });
});

describe('StaffCurriculumDelivery list loading', () => {
  it('clears units on framework switch and ignores the previous framework response', () => {
    const unitsA = new Subject<{ isSucceeded: boolean; message: string; data: CurriculumUnit[] }>();
    const unitsB = new Subject<{ isSucceeded: boolean; message: string; data: CurriculumUnit[] }>();
    const pendingLookup = new Subject<never>();
    const api = new Proxy(
      { getUnits: vi.fn().mockReturnValueOnce(unitsA).mockReturnValueOnce(unitsB) },
      {
        get: (target, key) =>
          key in target ? target[key as 'getUnits'] : vi.fn(() => pendingLookup),
      },
    );
    TestBed.configureTestingModule({
      providers: [
        ConfirmationService,
        DialogService,
        provideRouter([]),
        { provide: FeaturePageStore, useValue: { canPerformOrUnknown: () => true } },
        {
          provide: Common,
          useValue: {
            setPageHeaderInfo: vi.fn(),
            setBreadcrumbItems: vi.fn(),
            showMessage: vi.fn(),
          },
        },
        { provide: StaffCurriculumDeliveryApi, useValue: api },
        { provide: StaffAcademicStructureApi, useValue: api },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new StaffCurriculumDelivery());
    component.selectedTab.set('units-topics');
    const unit = (name: string) => ({
      isSucceeded: true,
      message: '',
      data: [{ id: 1, name } as unknown as CurriculumUnit],
    });

    component.selectFramework(1);
    unitsA.next(unit('Fractions'));
    unitsA.complete();
    component.selectFramework(2);

    expect(component.units.items()).toEqual([]);
    expect(component.units.loading()).toBe(true);
    // Lookups that never answer do not hold the other lists' skeletons.
    expect(component.plans.loading()).toBe(false);

    unitsB.next(unit('Grammar'));
    unitsB.complete();
    expect(component.units.items().map((item) => item.name)).toEqual(['Grammar']);
    expect(component.units.loading()).toBe(false);
  });
});
