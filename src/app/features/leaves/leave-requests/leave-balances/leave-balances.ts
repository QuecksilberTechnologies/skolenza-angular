import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';

import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { ILeaveBalance } from '@shared/interfaces';

import { LeaveStore } from '../../leave.store';
import LeaveBalanceManageDialog from './leave-balance-manage-dialog/leave-balance-manage-dialog';

@Component({
  selector: 'app-leave-balances',
  imports: [
    UserAvatar,
    CardModule,
    TableModule,
    ButtonModule,
    ConfirmDialogModule,
    TieredMenu,
    TableInlineFilters,
    TableSearchFilter,
    TableSearchInput,
    TableActionButton,
    TableLoader,
    TableEmptyMessage,
  ],
  providers: [ConfirmationService],
  templateUrl: './leave-balances.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveBalances {
  readonly #leaveStore = inject(LeaveStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly permissionsStore = inject(CurrentUserPermissionsStore);

  readonly leaveBalances = this.#leaveStore.leaveBalances;
  readonly totalRecords = this.#leaveStore.totalBalanceRecords;
  readonly isLoading = this.#leaveStore.isLoadingBalances;

  protected selectedBalance: ILeaveBalance | null = null;

  protected get actionMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    if (this.permissionsStore.canPerform('Leaves', 'Update')) {
      items.push({
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.openNew(this.selectedBalance ?? undefined),
      });
    }
    if (this.permissionsStore.canPerform('Leaves', 'Delete')) {
      if (items.length) items.push({ separator: true });
      items.push({
        label: 'Delete',
        icon: 'pi pi-trash',
        styleClass: '!text-red-500 dark:!text-red-400',
        command: () => {
          if (this.selectedBalance) {
            this.deleteBalance(this.selectedBalance);
          }
        },
      });
    }
    return items;
  }

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave Balances',
      pageDescription: 'Manage staffMember leave balances',
      pageIcon: 'pi pi-wallet',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Approval Inbox', routerLink: '/app/leave/inbox' },
      { label: 'Manage Leave Balances' },
    ]);

    this.#leaveStore.loadLeaveBalances();
  }

  openNew(leaveBalance?: ILeaveBalance) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(LeaveBalanceManageDialog, {
      header: leaveBalance ? 'Edit Leave Balance' : 'Add Leave Balance',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { leaveBalance },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: ILeaveBalance) => {
      if (result) {
        if (leaveBalance) {
          this.#leaveStore.updateLeaveBalance(result);
          this.#commonService.showMessage('Leave balance updated successfully', 'success');
        } else {
          this.#leaveStore.addLeaveBalance(result);
          this.#commonService.showMessage('Leave balance added successfully', 'success');
        }
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteBalance(leaveBalance: ILeaveBalance) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete the balance for <strong>${leaveBalance.staffMemberName ?? 'this staffMember'}</strong>? This action cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash !text-red-400 !text-xl',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.#leaveStore.deleteLeaveBalance(leaveBalance.id);
        this.#commonService.showMessage('Leave balance deleted successfully', 'success');
      },
    });
  }

  searchBalances(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }
}
