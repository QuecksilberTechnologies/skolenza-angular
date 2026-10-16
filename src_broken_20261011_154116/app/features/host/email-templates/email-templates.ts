import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { MenuModule } from '@openng/optimus-ui/menu';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { HeadlessDrawer } from '@shared/components/headless-drawer/headless-drawer';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { EmailTemplateRow, SettledSearchTerm } from '@shared/interfaces';

import { EmailTemplateDetail } from './email-template-detail/email-template-detail';
import { EMAIL_TEMPLATE_SCOPE } from './email-template-scope';
import { EmailTemplatesStore } from './email-templates.store';

@Component({
  selector: 'app-email-templates',
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    MenuModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableEmptyMessage,
    TableInlineFilters,
    TableLoader,
    TableSearchInput,
    HeadlessDrawer,
    EmailTemplateDetail,
  ],
  providers: [EmailTemplatesStore],
  templateUrl: './email-templates.html',
  styleUrl: './email-templates.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EmailTemplates {
  readonly #commonService = inject(Common);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #featurePageStore = inject(FeaturePageStore);
  readonly #router = inject(Router);

  readonly store = inject(EmailTemplatesStore);

  protected readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  readonly #scope = inject(EMAIL_TEMPLATE_SCOPE);

  // `my-menu`'s own moduleCode for this leaf, used only to source the label the sidebar already
  // shows for it.
  protected readonly moduleCode = this.#scope.moduleCode;

  protected readonly canAdd = computed(() => this.#scope.canPerform('Add'));
  protected readonly canUpdate = computed(() => this.#scope.canPerform('Update'));
  protected readonly canDelete = computed(() => this.#scope.canPerform('Delete'));
  /** Sync creates templates, so it rides the `Add` grant, as the API does. */
  protected readonly canSync = computed(() => this.#scope.sync !== null && this.canAdd());
  protected readonly canUseRowActions = computed(() => this.canUpdate() || this.canDelete());
  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 6 : 5));

  /** An empty grid means "nothing matches" when a filter is on, and "nothing exists" otherwise. */
  protected readonly hasActiveFilters = computed(
    () => this.store.search().trim() !== '' || this.store.isActive() !== null,
  );

  protected readonly selectedRow = signal<EmailTemplateRow | null>(null);
  /**
   * Separate from `selectedRow` on purpose — the context menu emits `contextMenuSelectionChange`
   * with `null` on every dismissal, which would blank the open drawer.
   */
  protected readonly detailRow = signal<EmailTemplateRow | null>(null);
  protected readonly isShowDetail = signal(false);

  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const row = this.selectedRow();
    const canUpdate = this.canUpdate();
    const canDelete = this.canDelete();
    // The API refuses to delete a template that is still in service, so the menu says so up front.
    const isInUse = !!row && row.isActive;

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
              command: () => row && this.editTemplate(row),
            },
            {
              label: row?.isActive ? 'Deactivate' : 'Activate',
              icon: row?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
              command: () => row && this.confirmToggleActive(row),
            },
          ]
        : []),
      ...(canUpdate && canDelete ? [{ separator: true }] : []),
      ...(canDelete
        ? [
            {
              label: isInUse ? 'Delete (deactivate it first)' : 'Delete',
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
      pageTitle: this.#featurePageStore.displayNameOf(this.moduleCode) ?? 'Email Templates',
      pageDescription: this.#scope.pageDescription,
      pageIcon: 'pi pi-file-edit',
      // A single crumb would only repeat the title; the description carries more.
      isBreadcrumbShow: false,
    });
  }

  loadEmailTemplates(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  syncTemplates() {
    this.store.syncEmailTemplates();
  }

  searchTemplates(value: SettledSearchTerm) {
    this.store.setSearch(value);
  }

  onStatusChange(value: boolean | null) {
    this.store.setIsActive(value);
  }

  showDetail(row: EmailTemplateRow) {
    this.detailRow.set(row);
    this.isShowDetail.set(true);
  }

  createTemplate() {
    this.#router.navigate([this.#scope.listRoute, 'new']);
  }

  editTemplate(row: EmailTemplateRow) {
    this.#router.navigate([this.#scope.listRoute, row.id, 'edit']);
  }

  onDetailEdit() {
    const row = this.detailRow();
    if (!row) {
      return;
    }

    // Leave the sheet open. Optimus appends the drawer mask straight to document.body and only
    // removes it on `animationend` — or, on destroy, while `visible` is still true. Closing first
    // strands the mask over the next route.
    this.editTemplate(row);
  }

  confirmToggleActive(row: EmailTemplateRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${row.templateName ?? 'this template'}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.toggleActive(row),
    });
  }

  confirmDelete(row: EmailTemplateRow) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${row.templateName ?? 'this template'}</strong>? Any mail flow that still asks for its code will have no wording to send.`,
      header: 'Delete Template',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete Template',
      rejectLabel: 'Keep Template',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.store.deleteEmailTemplate(row),
    });
  }
}
