import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Select } from '@openng/optimus-ui/select';
import { Table, TableLazyLoadEvent, TableModule } from '@openng/optimus-ui/table';
import { TagModule } from '@openng/optimus-ui/tag';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { HOST_MODULE } from '@core/host-modules';
import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { HostUserManageDialog } from '@shared/components/host-user/host-user-manage-dialog/host-user-manage-dialog';
import { HostUserResetPasswordDialog } from '@shared/components/host-user/host-user-reset-password-dialog/host-user-reset-password-dialog';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { HostUser } from '@shared/interfaces';

import { HostUsersStore } from './host-users.store';

@Component({
  selector: 'app-host-users',
  imports: [
    UserAvatar,
    TableModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ContextMenuModule,
    FormsModule,
    MenuModule,
    RouterLink,
    Select,
    TagModule,
    TooltipModule,
    TableActionButton,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
  ],
  providers: [HostUsersStore],
  templateUrl: './host-users.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HostUsers {
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly store = inject(HostUsersStore);
  readonly #commonService = inject(Common);
  readonly permissionsStore = inject(CurrentUserPermissionsStore);
  protected readonly moduleKey = HOST_MODULE.hostUser;

  protected readonly canUseRowActions = computed(
    () =>
      this.permissionsStore.canPerform(this.moduleKey, 'Update') ||
      this.permissionsStore.canPerform(this.moduleKey, 'Delete'),
  );

  /** The loading and empty rows must span the same columns the header renders. */
  protected readonly columnCount = computed(() => (this.canUseRowActions() ? 7 : 6));

  /** Server paging keeps the paginator's page index across filter changes, so it is reset by hand. */
  readonly table = viewChild<Table>('dt');

  /** Delete is the only action barred on your own row, so the menu can still come
   *  back empty even when `canUseRowActions()` is true. */
  protected hasRowActions(hostUser: HostUser): boolean {
    return (
      this.permissionsStore.canPerform(this.moduleKey, 'Update') ||
      (this.permissionsStore.canPerform(this.moduleKey, 'Delete') && !this.store.isSelf(hostUser))
    );
  }

  protected readonly selectedRow = signal<HostUser | null>(null);
  protected readonly actionMenuItems = computed<MenuItem[]>(() => {
    const hostUser = this.selectedRow();
    return this.buildActionMenuItems(hostUser ? this.store.isSelf(hostUser) : true);
  });

  readonly statusOptions = [
    { status: 'All', value: null },
    { status: 'Active', value: true },
    { status: 'Inactive', value: false },
  ];

  constructor() {
    this.setPageHeaderInfo();
  }

  setPageHeaderInfo() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Users',
      pageDescription: 'Manage platform host users and their access',
      pageIcon: 'pi pi-users',
      isBreadcrumbShow: false,
    });
  }

  // A host cannot delete their own account, so that entry is dropped.
  private buildActionMenuItems(isSelf: boolean): MenuItem[] {
    const canUpdate = this.permissionsStore.canPerform(this.moduleKey, 'Update');
    const canDelete = this.permissionsStore.canPerform(this.moduleKey, 'Delete');
    return [
      ...(canUpdate
        ? [
            {
              label: 'Edit',
              icon: 'pi pi-pencil',
              command: () => this.createEditHostUser(this.selectedRow() ?? undefined),
            },
            {
              label: 'Reset Password',
              icon: 'pi pi-key',
              command: () => this.resetPassword(this.selectedRow()!),
            },
          ]
        : []),
      ...(isSelf || !canDelete
        ? []
        : [
            {
              separator: true,
            },
            {
              label: 'Delete',
              styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
              icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
              command: () => this.confirmDeleteHostUser(this.selectedRow()!),
            },
          ]),
    ];
  }

  createEditHostUser(hostUser?: HostUser) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(HostUserManageDialog, {
      header: hostUser ? 'Update Platform User' : 'Add Platform User',
      style: { width: '90vw', maxWidth: '44rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { hostUser },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result) => {
      if (result) {
        this.store.reloadHostUsers();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  resetPassword(hostUser: HostUser) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(HostUserResetPasswordDialog, {
      header: 'Reset Password',
      style: { width: '90vw', maxWidth: '32rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { hostUser },
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  confirmDeleteHostUser(hostUser: HostUser) {
    this.#confirmationService.confirm({
      message: `This will permanently delete the host user <strong>${hostUser.name}</strong>. This action cannot be undone.`,
      header: 'Delete this host user',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Delete User',
      rejectLabel: 'Keep User',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.deleteHostUser(hostUser);
      },
    });
  }

  toggleActive(hostUser: HostUser) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to change the status of <strong>${hostUser.name}</strong>? You can update this again at any time.`,
      header: 'Change Status',
      icon: 'pi pi-exclamation-circle !text-amber-500 !text-2xl',
      acceptLabel: 'Update',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-primary',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.store.toggleActive(hostUser);
      },
    });
  }

  loadUsers(event: TableLazyLoadEvent) {
    this.store.loadPage(event);
  }

  /** Assigning `first` re-emits `onLazyLoad`, so this is a no-op when already on page one. */
  #resetToFirstPage() {
    const table = this.table();
    if (table) {
      table.first = 0;
    }
  }

  onStatusChange(status: boolean | null) {
    this.store.setStatusFilter(status ?? null);
    this.#resetToFirstPage();
  }
}
