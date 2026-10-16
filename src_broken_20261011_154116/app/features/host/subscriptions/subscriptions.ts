import { CurrencyPipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Select } from '@openng/optimus-ui/select';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { HOST_MODULE } from '@core/host-modules';
import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { SettledSearchTerm, SubscriptionPlan } from '@shared/interfaces';
import { CurrencySymbolPipe } from '@shared/pipes';

import { SubscriptionPlanDetail } from './subscription-plan-detail/subscription-plan-detail';
import SubscriptionPlanForm from './subscription-plan-form/subscription-plan-form';
import SubscriptionPlanModuleMap from './subscription-plan-module-map/subscription-plan-module-map';
import { SubscriptionsStore } from './subscriptions.store';

/** Scopes the delete confirmation to the dialog that owns the custom footer. */
const DELETE_PLAN_KEY = 'deleteSubscriptionPlan';

@Component({
  selector: 'app-subscriptions',
  imports: [
    ButtonModule,
    CurrencyPipe,
    CurrencySymbolPipe,
    DecimalPipe,
    TableModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    DrawerModule,
    FormsModule,
    MenuModule,
    Select,
    SubscriptionPlanDetail,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
  ],
  providers: [SubscriptionsStore],
  templateUrl: './subscriptions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Subscriptions {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #platformId = inject(PLATFORM_ID);
  readonly store = inject(SubscriptionsStore);
  readonly permissionsStore = inject(CurrentUserPermissionsStore);
  protected readonly moduleKey = HOST_MODULE.subscriptionPlan;

  protected readonly canUseRowActions = computed(
    () =>
      this.permissionsStore.canPerform(this.moduleKey, 'View') ||
      this.permissionsStore.canPerform(this.moduleKey, 'Update') ||
      this.permissionsStore.canPerform(this.moduleKey, 'Delete'),
  );

  /** Mapping writes to the plan, so it hard-gates on Update rather than soft-gating like the menu. */
  protected readonly canMapModules = computed(() =>
    this.permissionsStore.canPerform(this.moduleKey, 'Update'),
  );

  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(
    () => 5 + (this.canMapModules() ? 1 : 0) + (this.canUseRowActions() ? 1 : 0),
  );

  readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  /** Server paging keeps the paginator's page index across filter changes, so it is reset by hand. */
  readonly table = viewChild<Table>('dt');

  protected readonly selectedRow = signal<SubscriptionPlan | null>(null);

  /** The delete dialog holds itself open while the call runs, so it needs its own in-flight flag. */
  protected readonly isDeletingPlan = signal(false);
  protected readonly deletePlanKey = DELETE_PLAN_KEY;
  readonly #planPendingDelete = signal<SubscriptionPlan | null>(null);

  protected readonly detailPlan = signal<SubscriptionPlan | null>(null);
  protected readonly isDetailOpen = signal(false);

  /** `p-drawer` never restores focus itself, so the opener is remembered and refocused on close. */
  #returnFocusTo: HTMLElement | null = null;

  /** The row control that opened the action menu, so focus can return to it rather than the menu. */
  #actionMenuTrigger: HTMLElement | null = null;

  /** The store tags every row with the status it was fetched under, so the toggle direction comes
   *  from the row rather than the filter — under "All" the filter holds no direction. */
  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const isActive = this.selectedRow()?.isActive ?? true;
    const isMostPopular = this.selectedRow()?.isMostPopular ?? false;
    const canView = this.permissionsStore.canPerform(this.moduleKey, 'View');
    const canUpdate = this.permissionsStore.canPerform(this.moduleKey, 'Update');
    const canDelete = this.permissionsStore.canPerform(this.moduleKey, 'Delete');

    return [
      ...(canView
        ? [
            {
              label: 'View Details',
              icon: 'pi pi-eye',
              command: () =>
                this.viewDetails(this.selectedRow()!, this.#actionMenuTrigger ?? undefined),
            },
          ]
        : []),
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => this.createEditPlan(this.selectedRow()!),
            },
            // The Module Map column drops below `lg`, so the menu is the only way in on a phone.
            {
              label: 'Map Modules',
              icon: 'pi pi-sitemap',
              command: () => this.mapModules(this.selectedRow()!),
            },
          ]
        : []),
      ...(canUpdate
        ? [
            {
              label: isMostPopular ? 'Unset Most Popular' : 'Set as Most Popular',
              icon: isMostPopular ? 'pi pi-star-fill' : 'pi pi-star',
              command: () => this.store.toggleMostPopular(this.selectedRow()!),
            },
            { separator: true },
            isActive
              ? {
                  label: 'Deactivate',
                  styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
                  icon: 'pi pi-ban !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
                  command: () => this.confirmToggleActive(this.selectedRow()!),
                }
              : {
                  label: 'Activate',
                  icon: 'pi pi-check-circle',
                  command: () => this.confirmToggleActive(this.selectedRow()!),
                },
          ]
        : []),
      ...(canDelete
        ? [
            { separator: true },
            {
              label: 'Delete',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
              command: () => this.confirmDeletePlan(this.selectedRow()!),
            },
          ]
        : []),
    ];
  });

  constructor() {
    this.setPageHeaderInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Plans',
      pageDescription: 'Manage subscription plans and their information',
      pageIcon: 'pi pi-credit-card',
      isBreadcrumbShow: false,
    });
  }

  /** `TableSearchInput` hands over a settled term, so this fetches once per search. */
  searchSubscriptions(value: SettledSearchTerm) {
    this.store.setSearch(value);
    this.#resetToFirstPage();
  }

  loadPlans(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  /** Assigning `first` re-emits `onLazyLoad`, so this is a no-op when already on page one. */
  #resetToFirstPage() {
    const table = this.table();
    if (table) {
      table.first = 0;
    }
  }

  /** Remembers the kebab button so a menu command can hand focus back to the row, not the overlay. */
  openActionMenu(plan: SubscriptionPlan, event: Event, menu: { toggle: (event: Event) => void }) {
    this.selectedRow.set(plan);
    this.#actionMenuTrigger = event.currentTarget as HTMLElement | null;
    menu.toggle(event);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive);
    this.#resetToFirstPage();
  }

  createEditPlan(plan?: SubscriptionPlan) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(SubscriptionPlanForm, {
      header: plan ? 'Edit subscription plan' : 'Create subscription plan',
      style: { width: '90vw', maxWidth: '48rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: {
        plan,
        isActive: plan?.isActive ?? this.store.isActive() ?? true,
      },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) {
        this.store.reloadSubscriptionPlans();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  /** Opens the module map. The grid shows a module count, so a saved mapping has to refresh it. */
  mapModules(plan: SubscriptionPlan) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(SubscriptionPlanModuleMap, {
      header: `${plan.planName} - Module Map`,
      // The theme leaves `.p-dialog` a block, so `.p-dialog-content`'s `flex-grow` is dead and the
      // content spills past `max-height`. Making the root a flex column is what caps the dialog.
      style: {
        width: '90vw',
        maxWidth: '40rem',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      },
      // The tree owns the dialog's only scrollbar, so the content pane passes its height down
      // instead of scrolling itself.
      contentStyle: {
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '0',
      },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { plan },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((saved) => {
      if (saved) {
        this.store.reloadSubscriptionPlans();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  /**
   * `trigger` is passed explicitly because the kebab route runs from inside a body-appended menu
   * overlay that is torn down before the drawer closes — `document.activeElement` would point at a
   * detached node by then.
   */
  viewDetails(plan: SubscriptionPlan, trigger?: HTMLElement) {
    this.#returnFocusTo =
      trigger ??
      (isPlatformBrowser(this.#platformId) ? (document.activeElement as HTMLElement | null) : null);
    this.detailPlan.set(plan);
    this.isDetailOpen.set(true);
  }

  /**
   * Setting `visible` false does not make `p-drawer` emit `onHide` — only its own mask-click and
   * Escape paths do — so both routes funnel through here and it has to be safe to run twice.
   */
  closeDetails() {
    if (!this.isDetailOpen() && !this.detailPlan()) {
      return;
    }

    this.isDetailOpen.set(false);
    this.detailPlan.set(null);
    this.#returnFocusTo?.focus();
    this.#returnFocusTo = null;
  }

  /** Swaps the panel for the edit dialog rather than stacking a modal on top of the drawer. */
  editFromDetails(plan: SubscriptionPlan) {
    // The dialog autofocuses its first field, so the drawer must not pull focus back afterwards.
    this.#returnFocusTo = null;
    this.closeDetails();
    this.createEditPlan(plan);
  }

  /** Reactivating is harmless, so only the deactivate direction asks for confirmation. */
  confirmToggleActive(plan: SubscriptionPlan) {
    if (!plan.isActive) {
      this.store.toggleActive(plan);
      return;
    }

    this.#confirmationService.confirm({
      message: `This will deactivate <strong>${plan.planName}</strong>. Institutions will no longer be able to subscribe to it.`,
      header: 'Deactivate this plan',
      icon: 'pi pi-ban !text-red-400 !text-xl',
      acceptLabel: 'Deactivate Plan',
      rejectLabel: 'Keep Plan',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.toggleActive(plan);
      },
    });
  }

  /**
   * Its own keyed dialog: the `#footer` template that keeps the button busy replaces the built-in
   * buttons for every confirmation the dialog shows, and Deactivate still wants the stock pair.
   */
  confirmDeletePlan(plan: SubscriptionPlan) {
    this.#planPendingDelete.set(plan);
    this.#confirmationService.confirm({
      key: DELETE_PLAN_KEY,
      message: `This will permanently delete <strong>${plan.planName}</strong>. This action cannot be undone.`,
      header: 'Delete this plan',
      icon: 'pi pi-trash !text-red-400 !text-xl',
    });
  }

  deletePendingPlan() {
    const plan = this.#planPendingDelete();

    if (!plan) {
      return;
    }

    this.isDeletingPlan.set(true);
    this.store.deleteSubscriptionPlan(plan, () => {
      this.isDeletingPlan.set(false);
      this.cancelDelete();
    });
  }

  /** `close()` is unkeyed and hides every confirm dialog, which is fine — only one is ever open. */
  cancelDelete() {
    this.#planPendingDelete.set(null);
    this.#confirmationService.close();
  }
}
