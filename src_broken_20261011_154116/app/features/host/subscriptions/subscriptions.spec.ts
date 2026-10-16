import { DatePipe } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { CurrentUserPermissionsStore } from '@core/stores';
import { SettledSearchTerm, SubscriptionPlan } from '@shared/interfaces';

import Subscriptions from './subscriptions';
import { SubscriptionPlanRow, toPlanRows } from './subscriptions.model';
import { SubscriptionsStore } from './subscriptions.store';

const allowedOperations = new Set<string>();
const permissionsStoreMock = {
  canPerform: (_moduleName: string, operationName: string) => allowedOperations.has(operationName),
};

describe('Subscriptions', () => {
  let component: Subscriptions;
  let fixture: ComponentFixture<Subscriptions>;

  type Spy = ReturnType<typeof vi.fn>;
  let storeMock: {
    subscriptionPlans: Spy;
    planRows: Spy;
    isLoading: Spy;
    isActive: Spy;
    pageSize: Spy;
    totalRecords: Spy;
    setIsActive: Spy;
    setSearch: Spy;
    loadPage: Spy;
    reloadSubscriptionPlans: Spy;
    toggleActive: Spy;
    deleteSubscriptionPlan: Spy;
  };
  let confirmSpy: Spy;

  const plan = { id: 1, planName: 'Pro-Basic', isActive: true } as SubscriptionPlan;

  /** Built through `toPlanRows` so the fixture cannot drift from the shape the store emits. */
  const planRows: SubscriptionPlanRow[] = toPlanRows(
    [
      {
        id: 1,
        planName: 'Pro-Adv',
        maxUsers: 21,
        perDayPrice: 12,
        isFree: false,
        monthlyPrice: 300,
        yearlyPrice: 30000,
        isMostPopular: false,
        isCustom: false,
        currencyKey: '₹',
        modules: [{}, {}, {}],
        isActive: false,
      },
      {
        id: 2,
        planName: 'Pro Free Plan',
        maxUsers: 1,
        perDayPrice: 0,
        isFree: true,
        monthlyPrice: 0,
        yearlyPrice: 0,
        isMostPopular: false,
        isCustom: false,
        currencyKey: 'USD',
        modules: [],
        isActive: true,
      },
    ] as unknown as SubscriptionPlan[],
    // Seven live subscriptions on plan 1 and none on plan 2, so the grid has both an MRR figure
    // and an empty one to render. The end date is far future so the rows never lapse.
    Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      institutionId: index + 1,
      subscriptionPlanId: 1,
      subscriptionStartDate: '2026-01-01T00:00:00Z',
      subscriptionEndDate: '2099-01-01T00:00:00Z',
      isActive: true,
      paymentTxnId: null,
      paymentMode: null,
      isTrial: false,
    })),
  );

  /** `planRows` is a plain mock, not a signal, so the view only picks it up on an explicit check. */
  function renderRows(): HTMLElement {
    storeMock.planRows.mockReturnValue(planRows);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    allowedOperations.clear();
    for (const operation of ['Add', 'View', 'Update']) allowedOperations.add(operation);

    storeMock = {
      subscriptionPlans: vi.fn().mockReturnValue([]),
      planRows: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      isActive: vi.fn().mockReturnValue(true),
      pageSize: vi.fn().mockReturnValue(10),
      totalRecords: vi.fn().mockReturnValue(2),
      setIsActive: vi.fn(),
      setSearch: vi.fn(),
      loadPage: vi.fn(),
      reloadSubscriptionPlans: vi.fn(),
      toggleActive: vi.fn(),
      deleteSubscriptionPlan: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Subscriptions],
      providers: [
        MessageService,
        DatePipe,
        DialogService,
        ConfirmationService,
        // Permission gating is covered in the store spec; grant everything here.
        { provide: CurrentUserPermissionsStore, useValue: permissionsStoreMock },
      ],
    })
      .overrideComponent(Subscriptions, {
        set: {
          providers: [{ provide: SubscriptionsStore, useValue: storeMock }],
        },
      })
      .compileComponents();

    confirmSpy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm') as Spy;

    fixture = TestBed.createComponent(Subscriptions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('searchSubscriptions should hand the term to the store', () => {
    component.searchSubscriptions('pro' as SettledSearchTerm);
    expect(storeMock.setSearch).toHaveBeenCalledWith('pro');
  });

  it('loadPlans should forward the paginator event to the store', () => {
    const event = { first: 20, rows: 10 };
    component.loadPlans(event);
    expect(storeMock.loadPage).toHaveBeenCalledWith(event);
  });

  it('onStatusChange should refetch through the store', () => {
    component.onStatusChange(false);
    expect(storeMock.setIsActive).toHaveBeenCalledWith(false);
  });

  it('confirmToggleActive should ask before deactivating an active plan', () => {
    component.confirmToggleActive(plan);
    expect(confirmSpy).toHaveBeenCalled();
    expect(storeMock.toggleActive).not.toHaveBeenCalled();
  });

  it('confirmToggleActive should reactivate without confirmation', () => {
    const inactive = { ...plan, isActive: false };
    component.confirmToggleActive(inactive);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(storeMock.toggleActive).toHaveBeenCalledWith(inactive);
  });

  it('withholds Delete from a role that lacks the permission', () => {
    component['selectedRow'].set(plan);

    expect(component['actionMenuItems']().some((item) => item.label === 'Delete')).toBe(false);
  });

  it('offers Delete to a role that holds the permission', () => {
    allowedOperations.add('Delete');
    // `canPerform` is a plain function here, so the menu has to be built by a fresh component.
    const granted = TestBed.createComponent(Subscriptions);
    granted.detectChanges();
    granted.componentInstance['selectedRow'].set(plan);

    expect(
      granted.componentInstance['actionMenuItems']().some((item) => item.label === 'Delete'),
    ).toBe(true);
  });

  it('confirmDeletePlan should ask on its own dialog before deleting', () => {
    component.confirmDeletePlan(plan);

    expect(confirmSpy.mock.calls[0][0].key).toBe('deleteSubscriptionPlan');
    expect(storeMock.deleteSubscriptionPlan).not.toHaveBeenCalled();
  });

  it('keeps the delete dialog busy until the call settles', () => {
    component.confirmDeletePlan(plan);
    component.deletePendingPlan();

    expect(storeMock.deleteSubscriptionPlan).toHaveBeenCalledWith(plan, expect.any(Function));
    expect(component['isDeletingPlan']()).toBe(true);

    // The store hands back the settle hook the dialog closes on.
    storeMock.deleteSubscriptionPlan.mock.calls[0][1]();

    expect(component['isDeletingPlan']()).toBe(false);
  });

  it('deletePendingPlan does nothing without a pending plan', () => {
    component.deletePendingPlan();

    expect(storeMock.deleteSubscriptionPlan).not.toHaveBeenCalled();
  });

  it('viewDetails should open the drawer for the given plan', () => {
    component.viewDetails(plan);
    expect(component['isDetailOpen']()).toBe(true);
    expect(component['detailPlan']()).toBe(plan);
  });

  it('should offer View Details as the first action', () => {
    component['selectedRow'].set(plan);
    const [first] = component['actionMenuItems']();

    expect(first.label).toBe('View Details');

    first.command?.({} as never);
    expect(component['isDetailOpen']()).toBe(true);
    expect(component['detailPlan']()).toBe(plan);
  });

  it('closeDetails should clear the selected plan and restore focus to the opener', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    const focusSpy = vi.spyOn(trigger, 'focus');

    component.viewDetails(plan, trigger);
    // The panel's own Close button sets `visible` false, which never makes `p-drawer` emit onHide.
    component.closeDetails();

    expect(component['isDetailOpen']()).toBe(false);
    expect(component['detailPlan']()).toBeNull();
    expect(focusSpy).toHaveBeenCalled();
    trigger.remove();
  });

  it('closeDetails should be safe to run twice when onHide also fires', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    const focusSpy = vi.spyOn(trigger, 'focus');

    component.viewDetails(plan, trigger);
    component.closeDetails();
    component.closeDetails();

    expect(focusSpy).toHaveBeenCalledTimes(1);
    trigger.remove();
  });

  it('editFromDetails should close the drawer and open the edit dialog', () => {
    const openSpy = vi.spyOn(TestBed.inject(DialogService), 'open');
    component.viewDetails(plan);

    component.editFromDetails(plan);

    expect(component['isDetailOpen']()).toBe(false);
    expect(openSpy).toHaveBeenCalled();
  });

  it('editFromDetails should leave focus to the dialog rather than the table row', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const focusSpy = vi.spyOn(trigger, 'focus');

    component.viewDetails(plan, trigger);
    component.editFromDetails(plan);
    focusSpy.mockClear();

    // The drawer's hide fires after the dialog is already open.
    component.closeDetails();

    expect(focusSpy).not.toHaveBeenCalled();
    trigger.remove();
  });

  it('renders the seven columns in order', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(
      [...host.querySelectorAll('thead th')].map((th) =>
        th.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual([
      'Plan',
      'Pricing',
      'Limits (users)',
      'Subscribers',
      'Module Map',
      'Status',
      'Actions',
    ]);
    expect(component['columnCount']()).toBe(7);
  });

  it('marks every header as a column header, and none as sortable', () => {
    const host = fixture.nativeElement as HTMLElement;
    const headers = [...host.querySelectorAll('thead th')];

    expect(headers.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    // The endpoint sorts nothing, so no column may advertise a sort it cannot honour.
    expect(headers.filter((th) => th.hasAttribute('aria-sort'))).toHaveLength(0);
  });

  it('leads the pricing cell with monthly and names the currency it is in', () => {
    const cell = renderRows().querySelectorAll('tbody tr')[0].querySelectorAll('td')[1];
    const text = cell.textContent?.replace(/\s+/g, ' ').trim();

    expect(text).toContain('300');
    expect(text).toContain('per month');
    expect(text).toContain('INR');
    // Yearly and per-day fall in behind it rather than taking columns of their own.
    expect(text).toContain('per year');
    expect(text).toContain('per day');
  });

  it('prices a free plan as Free rather than as missing data', () => {
    const cell = renderRows().querySelectorAll('tbody tr')[1].querySelectorAll('td')[1];

    expect(cell.textContent).toContain('Free');
    expect(cell.textContent).not.toContain('—');
  });

  it('counts the modules once, in the column that maps them', () => {
    const rows = renderRows().querySelectorAll('tbody tr');

    expect(rows[0].querySelectorAll('td')[4].textContent).toContain('3 mapped');
    // A plan with no mapping invites one rather than reporting a zero.
    expect(rows[1].querySelectorAll('td')[4].textContent).toContain('Map');
    // The limits cell carries users alone — the count is not repeated across two columns.
    expect(rows[0].querySelectorAll('td')[2].textContent).not.toContain('module');
  });

  it('agrees the noun with the count', () => {
    const rows = renderRows().querySelectorAll('tbody tr');

    expect(rows[0].querySelectorAll('td')[2].textContent).toContain('21 users');
    expect(rows[1].querySelectorAll('td')[2].textContent).toContain('1 user');
    expect(rows[1].querySelectorAll('td')[2].textContent).not.toContain('1 users');
  });

  it('leaves the revenue line off when a plan has no subscribers', () => {
    const rows = renderRows().querySelectorAll('tbody tr');

    expect(rows[0].querySelectorAll('td')[3].textContent).toContain('MRR');
    expect(rows[1].querySelectorAll('td')[3].textContent).not.toContain('MRR');
    expect(rows[1].querySelectorAll('td')[3].textContent).not.toContain('—');
  });

  it('drops the Actions and Module Map columns when the role has neither', () => {
    allowedOperations.clear();

    const denied = TestBed.createComponent(Subscriptions);
    denied.detectChanges();
    const host = denied.nativeElement as HTMLElement;

    expect([...host.querySelectorAll('th')].some((th) => th.textContent?.includes('Actions'))).toBe(
      false,
    );
    expect(
      [...host.querySelectorAll('th')].some((th) => th.textContent?.includes('Module Map')),
    ).toBe(false);
    expect(host.querySelector('tbody td')?.getAttribute('colspan')).toBe('5');
    expect(denied.componentInstance['columnCount']()).toBe(5);
  });

  /** Mapping writes to the plan, so View alone must not surface the opener. */
  it('drops the Module Map column for a view-only role', () => {
    allowedOperations.clear();
    allowedOperations.add('View');

    const viewer = TestBed.createComponent(Subscriptions);
    viewer.detectChanges();
    const host = viewer.nativeElement as HTMLElement;

    expect(
      [...host.querySelectorAll('th')].some((th) => th.textContent?.includes('Module Map')),
    ).toBe(false);
    expect(viewer.componentInstance['columnCount']()).toBe(6);
  });

  it('opens the module map dialog and reloads the grid once a mapping is saved', () => {
    const onClose = new Subject<unknown>();
    const openSpy = vi
      .spyOn(TestBed.inject(DialogService), 'open')
      .mockReturnValue({ onClose, close: vi.fn() } as unknown as DynamicDialogRef);

    component.mapModules(plan);

    const config = openSpy.mock.calls.at(-1)![1];
    expect(config.data).toEqual({ plan });
    expect(config.header).toBe(`${plan.planName} - Module Map`);

    onClose.next(true);
    expect(storeMock.reloadSubscriptionPlans).toHaveBeenCalled();
  });
});
