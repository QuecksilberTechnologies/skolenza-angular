import { DatePipe } from '@angular/common';
import { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from '@openng/optimus-ui/api';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PlanModuleMappingApi } from '@core/services';
import { PlanModuleOption, SubscriptionPlan } from '@shared/interfaces';

import SubscriptionPlanModuleMap from './subscription-plan-module-map';
import { ModuleTreeNode, nodesForIds } from './subscription-plan-module-map.model';

describe('SubscriptionPlanModuleMap', () => {
  let fixture: ComponentFixture<SubscriptionPlanModuleMap>;

  type Spy = ReturnType<typeof vi.fn>;
  let apiMock: { getPlanModuleOptions: Spy; savePlanModuleMapping: Spy };
  let dialogRefMock: { close: Spy };

  const plan = {
    id: 2,
    planName: 'Pro-Basic',
    maxUsers: 10,
    perDayPrice: 10,
    isFree: false,
    monthlyPrice: 200,
    yearlyPrice: 2199,
    isMostPopular: false,
    isCustom: false,
    currencyKey: 'INR',
    modules: [],
  } satisfies SubscriptionPlan;

  const node = (
    moduleId: number,
    moduleName: string,
    displayName: string,
    overrides: Partial<PlanModuleOption> = {},
  ): PlanModuleOption => ({
    moduleId,
    moduleName,
    displayName,
    isMapped: false,
    isActive: true,
    children: [],
    ...overrides,
  });

  const modules: PlanModuleOption[] = [
    node(27, 'Asset-Management', 'Asset management', {
      isMapped: true,
      children: [node(28, 'Asset-Create', 'Asset creation')],
    }),
    node(5, 'Common', 'Basic menu', {
      children: [
        node(7, 'Notifications', 'Notifications', { children: [node(12, 'Message', 'Message')] }),
      ],
    }),
  ];

  const optionsResponse = {
    isSucceeded: true,
    message: 'Subscription plan module options retrieved successfully.',
    errors: [],
    data: { subscriptionPlanId: 2, modules },
  };

  const createComponent = async (options: unknown = of(optionsResponse)) => {
    apiMock = {
      getPlanModuleOptions: vi.fn().mockReturnValue(options),
      savePlanModuleMapping: vi
        .fn()
        .mockReturnValue(of({ isSucceeded: true, message: 'Saved.', errors: [], data: null })),
    };
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SubscriptionPlanModuleMap],
      providers: [
        MessageService,
        DatePipe,
        provideRouter([]),
        { provide: PlanModuleMappingApi, useValue: apiMock },
        { provide: DynamicDialogRef, useValue: dialogRefMock },
        { provide: DynamicDialogConfig, useValue: { data: { plan } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionPlanModuleMap);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** The component is the unit under test, so its protected surface is reached through the instance. */
  const component = () =>
    fixture.componentInstance as unknown as {
      nodes: WritableSignal<ModuleTreeNode[]>;
      selection: WritableSignal<ModuleTreeNode[]>;
      moduleIds: () => number[];
      totalModules: () => number;
      isDirty: () => boolean;
      selectAll: () => void;
      clearAll: () => void;
      onNodeUnselect: (node?: ModuleTreeNode) => void;
      expandAll: () => void;
      collapseAll: () => void;
      save: () => void;
    };

  const nodeFor = (moduleId: number) => nodesForIds(component().nodes(), new Set([moduleId]))[0];

  it('should pre-check exactly the modules the API flagged as mapped', async () => {
    await createComponent();

    expect(apiMock.getPlanModuleOptions).toHaveBeenCalledWith(2);
    expect(component().moduleIds()).toEqual([27]);
    expect(component().isDirty()).toBe(false);
  });

  it('should count every module in the tree, at every depth', async () => {
    await createComponent();

    expect(component().totalModules()).toBe(5);
  });

  it('should open with every branch expanded', async () => {
    await createComponent();

    expect(
      component()
        .nodes()
        .every((node) => node.expanded),
    ).toBe(true);
  });

  /** `p-tree` drops a partially selected parent from its own selection; the dialog puts it back. */
  it('should show a mapped parent with unmapped children as indeterminate, not checked', async () => {
    await createComponent();

    expect(nodeFor(27).partialSelected).toBe(true);
    expect(
      component()
        .selection()
        .map((node) => node.data),
    ).toEqual([]);
  });

  it('should send every checked id plus the mapped branch the tree cannot hold', async () => {
    await createComponent();

    // What the tree hands back once the user ticks a leaf under an untouched parent: 5 and 7 turn
    // indeterminate, but the API never returned them mapped, so they stay out of the payload.
    component().selection.set([nodeFor(12)]);
    nodeFor(7).partialSelected = true;
    nodeFor(5).partialSelected = true;

    expect(component().isDirty()).toBe(true);

    component().save();

    expect(apiMock.savePlanModuleMapping).toHaveBeenCalledWith({
      subscriptionPlanId: 2,
      moduleIds: [12, 27],
      remark: null,
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should unmap a preserved branch once the user unticks it', async () => {
    await createComponent();

    expect(component().moduleIds()).toEqual([27]);

    // Ticking the partial parent selects the whole subtree, unticking it clears the mapping.
    component().selection.set([nodeFor(27), nodeFor(28)]);
    component().selection.set([]);
    component().onNodeUnselect(nodeFor(27));

    expect(component().moduleIds()).toEqual([]);
    expect(component().isDirty()).toBe(true);
  });

  it('should keep a preserved branch when an unrelated node is unticked', async () => {
    await createComponent();

    component().onNodeUnselect(nodeFor(12));

    expect(component().moduleIds()).toEqual([27]);
    expect(component().isDirty()).toBe(false);
  });

  it('should stay pristine when the selection returns to what the API sent', async () => {
    await createComponent();

    component().selection.set([nodeFor(28)]);
    expect(component().isDirty()).toBe(true);

    component().selection.set([]);
    expect(component().isDirty()).toBe(false);
  });

  it('should keep the dialog open when the save is rejected', async () => {
    await createComponent();
    apiMock.savePlanModuleMapping.mockReturnValue(
      of({ isSucceeded: false, message: 'Nope.', errors: [], data: null }),
    );

    component().selection.set([nodeFor(28)]);
    component().save();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  it('should render an empty tree when the options call fails', async () => {
    await createComponent(throwError(() => new Error('boom')));

    expect(component().nodes()).toEqual([]);
    expect(component().moduleIds()).toEqual([]);
  });

  it('should tick every module at every depth on select all', async () => {
    await createComponent();

    component().selectAll();

    expect(component().moduleIds()).toEqual([5, 7, 12, 27, 28]);
    expect(nodeFor(27).partialSelected).toBe(false);
    expect(component().isDirty()).toBe(true);
  });

  it('should leave nothing selected on clear, partial parents included', async () => {
    await createComponent();

    component().clearAll();

    expect(component().moduleIds()).toEqual([]);
    expect(nodeFor(27).partialSelected).toBe(false);
    expect(component().isDirty()).toBe(true);
  });

  it('should collapse and re-expand every branch without touching the selection', async () => {
    await createComponent();

    component().collapseAll();
    expect(nodeFor(5).expanded).toBe(false);
    expect(nodeFor(7).expanded).toBe(false);
    expect(nodeFor(12).expanded).toBe(true);
    expect(component().isDirty()).toBe(false);

    component().expandAll();
    expect(nodeFor(5).expanded).toBe(true);
    expect(nodeFor(7).expanded).toBe(true);
  });
});
