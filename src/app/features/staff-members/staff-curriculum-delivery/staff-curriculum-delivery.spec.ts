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
import { BehaviorSubject, of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Common, StaffAcademicStructureApi, StaffCurriculumDeliveryApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  CurriculumFramework,
  CurriculumUnit,
  LessonPlan,
  StaffTeachingAssignment,
} from '@shared/interfaces';

import { CurriculumFrameworkDialog } from './curriculum-framework-dialog/curriculum-framework-dialog';
import { LessonDeliveryDialog } from './lesson-delivery-dialog/lesson-delivery-dialog';
import StaffCurriculumDelivery, { topicsForTeachingAssignment } from './staff-curriculum-delivery';

const STATUSES = [
  { id: 1, code: 'DRAFT', name: 'Draft' },
  { id: 2, code: 'SUBMITTED', name: 'Submitted' },
  { id: 3, code: 'APPROVED', name: 'Approved' },
  { id: 4, code: 'REJECTED', name: 'Rejected' },
];

describe('StaffCurriculumDelivery topic selection', () => {
  it('offers only topics belonging to the selected teaching assignment course offering', () => {
    const units = [
      { courseOfferingId: 11, topics: [{ id: 101, name: 'Fractions' }] },
      { courseOfferingId: 22, topics: [{ id: 202, name: 'Grammar' }] },
    ] as CurriculumUnit[];
    const assignments = [
      { id: 7, courseOfferingId: 11 },
      { id: 8, courseOfferingId: 22 },
    ] as StaffTeachingAssignment[];

    expect(topicsForTeachingAssignment(units, assignments, 7).map((topic) => topic.id)).toEqual([
      101,
    ]);
  });

  it('offers no topics until a valid teaching assignment is selected', () => {
    expect(topicsForTeachingAssignment([], [], null)).toEqual([]);
  });
});

describe('StaffCurriculumDelivery', () => {
  // Every API method answers with an empty successful list.
  const emptyApi = () =>
    new Proxy({}, { get: () => vi.fn(() => of({ isSucceeded: true, message: '', data: [] })) });

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

  it('names the next step in the empty state only for users who can add', () => {
    expect(component.emptyMessage('lesson plans', 'Add Lesson Plan')).toBe(
      'No lesson plans yet. Use Add Lesson Plan to create one.',
    );
  });

  it('drops the add hint from the empty state without Add permission', () => {
    denied.add('Add');

    expect(component.emptyMessage('lesson plans', 'Add Lesson Plan')).toBe('No lesson plans yet.');
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
    component.plans.set([plan]);

    component.planActions(plan)[0].command?.({});

    expect(open).toHaveBeenCalledWith(
      LessonDeliveryDialog,
      expect.objectContaining({
        header: 'Record Lesson Delivery',
        data: expect.objectContaining({ lessonPlanId: 5, approvedPlans: [plan] }),
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
    const unit = (name: string) => ({
      isSucceeded: true,
      message: '',
      data: [{ id: 1, name, topics: [] } as unknown as CurriculumUnit],
    });

    component.selectFramework(1);
    unitsA.next(unit('Fractions'));
    unitsA.complete();
    component.selectFramework(2);

    expect(component.units()).toEqual([]);
    expect(component.loading.units()).toBe(true);
    // Lookups that never answer do not hold the other lists' skeletons.
    expect(component.loading.plans()).toBe(false);

    unitsB.next(unit('Grammar'));
    unitsB.complete();
    expect(component.units().map((item) => item.name)).toEqual(['Grammar']);
    expect(component.loading.units()).toBe(false);
  });
});
