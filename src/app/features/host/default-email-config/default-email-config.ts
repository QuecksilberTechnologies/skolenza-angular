import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { MenuModule } from '@openng/optimus-ui/menu';
import { TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { HOST_MODULE } from '@core/host-modules';
import { Common } from '@core/services';
import { CurrentUserPermissionsStore, FeaturePageStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { DefaultEmailConfigRow } from '@shared/interfaces';

import { DefaultEmailConfigDetail } from './default-email-config-detail/default-email-config-detail';
import { DefaultEmailConfigStore } from './default-email-config.store';

@Component({
  selector: 'app-default-email-config',
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
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
    HeadlessDrawer,
    DefaultEmailConfigDetail,
  ],
  providers: [DefaultEmailConfigStore],
  templateUrl: './default-email-config.html',
  styleUrl: './default-email-config.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DefaultEmailConfig {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #permissionsStore = inject(CurrentUserPermissionsStore);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #router = inject(Router);

  readonly store = inject(DefaultEmailConfigStore);

  // The central SMTP screen has no catalog module of its own — it rides the parent `Host` key,
  // the same way the institution and device screens do.
  protected readonly moduleKey = HOST_MODULE.host;
  // Distinct from `moduleKey` above — this is `my-menu`'s own moduleCode, used only to source
  // the label the sidebar already shows for this leaf.
  protected readonly moduleCode = 'HOST_DEFAULT_EMAIL_CONFIG';

  protected readonly canAdd = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Add'),
  );
  protected readonly canUpdate = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Update'),
  );
  protected readonly canDelete = computed(() =>
    this.#permissionsStore.canPerform(this.moduleKey, 'Delete'),
  );
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 6 : 5));

  /** An empty grid means "nothing matches" when a search is on, and "nothing exists" otherwise. */
  protected readonly hasActiveFilters = computed(() => this.store.search().trim() !== '');

  /** Announces the new total after a search silently swaps the grid. */
  protected readonly resultSummary = computed(() => {
    if (this.store.isLoading()) {
      return '';
    }
    const total = this.store.visibleConfigs().length;
    return `${total} ${total === 1 ? 'configuration' : 'configurations'} found`;
  });

  protected readonly selectedRow = signal<DefaultEmailConfigRow | null>(null);
  /**
   * Separate from `selectedRow` on purpose — the context menu emits `contextMenuSelectionChange`
   * with `null` on every dismissal, which would blank the open drawer.
   */
  protected readonly detailRow = signal<DefaultEmailConfigRow | null>(null);
  protected readonly isShowDetail = signal(false);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();
    // The API refuses to delete whatever is still in service, so the menu says so up front.
    const isInUse = !!row && (row.isActive || row.isDefault);

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
              command: () => row && this.editConfig(row),
            },
          ]
        : []),
      ...(canUpdate && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: isInUse ? 'Delete (replace it first)' : 'Delete',
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              disabled: isInUse,
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
      pageTitle:
        this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Default Email Configuration',
      pageDescription: 'Manage the central SMTP account new institutions inherit',
      pageIcon: 'pi pi-envelope',
      // A single crumb would only repeat the title; the description carries more.
      isBreadcrumbShow: false,
    });
  }

  searchConfigs(value: string) {
    this.store.setSearch(value);
  }

  showDetail(row: DefaultEmailConfigRow) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  createConfig() {
    this.#router.navigate(['/app/default-email-config/new']);
  }

  editConfig(row: DefaultEmailConfigRow) {
    this.#router.navigate(['/app/default-email-config', row.id, 'edit']);
  }

  onDetailEdit() {
    const row = this.detailRow();
    if (!row) {
      return;
    }

    // Leave the sheet open. Optimus appends the drawer mask straight to document.body and only
    // removes it on `animationend` — or, on destroy, while `visible` is still true. Closing first
    // strands the mask over the next route.
    this.editConfig(row);
  }

  confirmDelete(row: DefaultEmailConfigRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${row.configName ?? 'this configuration'}</strong>? Institutions that already copied it keep their own settings.`,
      header: 'Delete Configuration',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Configuration',
      rejectLabel: 'Keep Configuration',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteConfig(row),
    });
  }
}
