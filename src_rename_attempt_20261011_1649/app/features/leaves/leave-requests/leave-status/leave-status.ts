import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { ContextMenuModule } from '@openng/optimus-ui/contextmenu';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { Table, TableModule } from '@openng/optimus-ui/table';

import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { ILeaveStatus } from '@shared/interfaces';

import { LeaveStore } from '../../leave.store';
import LeaveStatusManageDialog from './leave-status-manage-dialog/leave-status-manage-dialog';

@Component({
  selector: 'app-leave-status',
  imports: [
    ButtonModule,
    CardModule,
    TableModule,
    FormsModule,
    ConfirmDialogModule,
    MenuModule,
    ContextMenuModule,
    TableInlineFilters,
    TableSearchInput,
    TableEmptyMessage,
    TableLoader,
    TableActionButton,
  ],
  providers: [ConfirmationService],
  templateUrl: './leave-status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveStatus {
  readonly #leaveStore = inject(LeaveStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly permissionsStore = inject(CurrentUserPermissionsStore);
  readonly leaveStatus = this.#leaveStore.leaveStatus;
  readonly isLoadingStatus = this.#leaveStore.isLoadingStatus;
  protected selectedRow!: ILeaveStatus;

  protected get actionMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    if (this.permissionsStore.canPerform('Leaves', 'Update')) {
      items.push({
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.openNew(this.selectedRow),
      });
    }
    if (this.permissionsStore.canPerform('Leaves', 'Delete')) {
      if (items.length) items.push({ separator: true });
      items.push({
        label: 'Delete',
        styleClass: '!text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700 font-medium',
        icon: 'pi pi-trash !text-red-500 dark:!text-red-400 dark:hover:bg-zinc-700',
        command: () => this.deleteStatus(this.selectedRow),
      });
    }
    return items;
  }

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave Status',
      pageDescription: 'Manage leave status labels',
      pageIcon: 'pi pi-tag',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Approval Inbox', routerLink: '/app/leave/inbox' },
      { label: 'Manage Leave Status' },
    ]);

    this.#leaveStore.loadLeaveStatus();
  }

  openNew(leaveStatus?: ILeaveStatus) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(LeaveStatusManageDialog, {
      header: leaveStatus ? 'Edit Leave Status' : 'Add Leave Status',
      modal: true,
      closable: true,
      style: { width: '90vw', maxWidth: '45rem' },
      contentStyle: { overflow: 'hidden' },
      data: { leaveStatus },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.#leaveStore.loadLeaveStatus();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteStatus(leaveStatus: ILeaveStatus) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete ${leaveStatus.statusName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#leaveStore.deleteLeaveStatus(leaveStatus.id),
    });
  }

  searchLeaves(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }
}
