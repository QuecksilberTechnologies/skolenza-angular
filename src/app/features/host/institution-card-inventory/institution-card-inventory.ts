import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { HOST_MODULE } from '@core/host-modules';
import { Common, HostBulkImportApi } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { BulkImportDialog } from '@shared/components/bulk-import-dialog/bulk-import-dialog';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableFilterSelect } from '@shared/components/table/table-filter-select/table-filter-select';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { BulkImportDialogData, SettledSearchTerm, InstitutionCardMasterRow } from '@shared/interfaces';

import { hostBulkImportAdapter, INSTITUTION_CARD_IMPORT_DISPLAY } from '../host-bulk-import';
import { InstitutionCardInventoryDetail } from './institution-card-inventory-detail/institution-card-inventory-detail';
import { InstitutionCardInventoryStore } from './institution-card-inventory.store';

@Component({
  selector: 'app-institution-card-inventory',
  imports: [
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    MenuModule,
    TableModule,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableFilterSelect,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
    HeadlessDrawer,
    InstitutionCardInventoryDetail,
  ],
  providers: [InstitutionCardInventoryStore],
  templateUrl: './institution-card-inventory.html',
  styleUrl: './institution-card-inventory.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class InstitutionCardInventory {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #router = inject(Router);
  readonly #dialogService = inject(DialogService);
  readonly #hostBulkImportApi = inject(HostBulkImportApi);
  readonly #destroyRef = inject(DestroyRef);

  readonly store = inject(InstitutionCardInventoryStore);

  /** No "All" row — the select's clear button already means "no status filter". */
  protected readonly statusOptions = [
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  // Card inventory has no catalog module of its own — it rides the parent `Host` key until the
  // backend models it separately.
  protected readonly moduleKey = HOST_MODULE.host;
  // Distinct from `moduleKey` above — this is `my-menu`'s own moduleCode, used only to source
  // the label the sidebar already shows for this leaf.
  protected readonly moduleCode = 'HOST_INSTITUTION_CARD_INVENTORY';

  protected readonly canAdd = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Add'),
  );

  /**
   * Import writes into one institution's inventory, and the API takes that institution as `InstitutionId` rather
   * than inferring it - so the button waits for the institution filter to name one. "Any institution" is a
   * valid way to read the list and not a valid way to import into it.
   */
  protected readonly canImport = computed(() => this.canAdd() && !!this.store.institutionId());
  protected readonly canUpdate = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Delete'),
  );
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 7 : 6));

  protected readonly cardStatusLabel = (cardStatus: number | null | undefined): string =>
    this.store.cardStatusOptions().find((option) => Number(option.value) === cardStatus)?.label ??
    '—';

  /** The `InstitutionCardStatus` number that means Assigned, named by the ddl rather than hardcoded. */
  protected readonly assignedCardStatus = computed(() => {
    const option = this.store
      .cardStatusOptions()
      .find((candidate) => candidate.label.trim().toLowerCase() === 'assigned');

    return option ? Number(option.value) : null;
  });

  /**
   * A card already bound to an staffMember device is frozen: editing, deactivating or deleting it
   * would strand the enrollment holding it.
   *
   * Fails closed on purpose. While the ddl is still loading, or if it names no Assigned state, the
   * app cannot tell an assigned card from an available one, and freezing a card that turns out to
   * be free is recoverable in a way that editing one that turns out to be bound is not.
   */
  protected readonly isAssigned = (row: InstitutionCardMasterRow | null | undefined): boolean => {
    if (!row || row.cardStatus === null || row.cardStatus === undefined) {
      return false;
    }

    const assigned = this.assignedCardStatus();
    return assigned === null || row.cardStatus === assigned;
  };

  /** An empty grid means "nothing matches" when a filter is on, and "nothing exists" otherwise.
   *  Only meaningful once a institution is picked — see `store.hasInstitution`. */
  protected readonly hasActiveFilters = computed(
    () =>
      !!this.store.search() || this.store.cardStatus() !== null || this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<InstitutionCardMasterRow | null>(null);
  /**
   * Separate from `selectedRow` on purpose — the context menu emits `contextMenuSelectionChange`
   * with `null` on every dismissal, which would blank the open drawer.
   */
  protected readonly detailRow = signal<InstitutionCardMasterRow | null>(null);
  protected readonly isShowDetail = signal(false);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();
    // The write actions stay listed but inert on an assigned card, so the menu explains the state
    // instead of silently offering fewer entries on some rows than others.
    const isAssigned = !!row && this.isAssigned(row);

    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => row && this.showDetail(row),
      },
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              disabled: isAssigned,
              command: () => row && this.editCardMaster(row),
            },
            {
              label: row?.isActive ? 'Deactivate' : 'Activate',
              icon: row?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
              disabled: isAssigned,
              command: () => row && this.confirmToggleActive(row),
            },
          ]
        : []),
      ...(canUpdate && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: 'Delete',
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              disabled: isAssigned,
              command: () => row && this.confirmDelete(row),
            },
          ]
        : []),
    ];
  });

  constructor() {
    effect(() => this.setPageHeaderInfo());
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Card Inventory',
      pageDescription: 'Manage the physical card procurement inventory for institutions',
      pageIcon: 'pi pi-id-card',
      // A single crumb would only repeat the title; the description carries more.
      isBreadcrumbShow: false,
    });
  }

  searchCardMasters(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onInstitutionChange(institutionId: string | null) {
    this.store.setInstitutionId(institutionId ?? null);
  }

  onCardStatusChange(cardStatus: string | null) {
    this.store.setCardStatus(cardStatus ?? null);
  }

  onStatusChange(isActive: boolean | null) {
    this.store.setIsActive(isActive ?? null);
  }

  loadCardMasters(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  showDetail(row: InstitutionCardMasterRow) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  createCardMaster() {
    this.#router.navigate(['/app/institution-card-inventory/new'], {
      queryParams: { institutionId: this.store.institutionId() },
    });
  }

  /** `get-by-id` is institution-scoped and the form is route-driven, so the institution travels on the query
   *  string — router `state` would not survive a refresh or a pasted link. */
  editCardMaster(row: InstitutionCardMasterRow) {
    this.#router.navigate(['/app/institution-card-inventory', row.id, 'edit'], {
      queryParams: { institutionId: row.institutionId ?? this.store.institutionId() },
    });
  }

  onDetailEdit() {
    const row = this.detailRow();
    if (!row) {
      return;
    }

    // Leave the sheet open. Optimus appends the drawer mask straight to document.body and only
    // removes it on `animationend` — or, on destroy, while `visible` is still true. Closing first
    // strands the mask over the next route.
    this.editCardMaster(row);
  }

  confirmToggleActive(row: InstitutionCardMasterRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${row.cardNumber ?? 'this card'}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(row),
    });
  }

  confirmDelete(row: InstitutionCardMasterRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${row.cardNumber ?? 'this card'}</strong>? This cannot be undone.`,
      header: 'Delete Card',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Card',
      rejectLabel: 'Keep Card',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteCardMaster(row),
    });
  }
  openBulkImport() {
    // The dialog owns the flow; this screen owns its endpoints and its copy.
    const data: BulkImportDialogData = {
      adapter: hostBulkImportAdapter(this.#hostBulkImportApi, 'InstitutionCardMaster', () =>
        this.store.institutionId(),
      ),
      display: INSTITUTION_CARD_IMPORT_DISPLAY,
    };

    const ref = this.#dialogService.open(BulkImportDialog, {
      header: 'Import Cards',
      style: { width: '90vw', maxWidth: '64rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      // Focus enters the dialog on open: the trap only wraps focus that is already inside.
      data,
    });

    // The dialog closes with `true` once an import job ran, so the grid is refetched rather than
    // left showing the inventory from before the import.
    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((imported: boolean) => {
      if (imported) this.store.reloadCardMasters();
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }
}
