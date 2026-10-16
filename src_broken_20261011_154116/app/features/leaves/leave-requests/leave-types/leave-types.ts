import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MenuItem } from '@openng/optimus-ui/api';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MenuModule } from '@openng/optimus-ui/menu';
import { TableModule } from '@openng/optimus-ui/table';

import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { ILeaveType } from '@shared/interfaces';

import { LeaveStore } from '../../leave.store';
import LeaveTypesManageDialog from './leave-types-manage-dialog/leave-types-manage-dialog';

@Component({
  selector: 'app-leave-types',
  imports: [
    ButtonModule,
    CardModule,
    TableModule,
    FormsModule,
    ConfirmDialogModule,
    MenuModule,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchFilter,
  ],
  providers: [ConfirmationService],
  templateUrl: './leave-types.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveTypes {
  readonly #leaveStore = inject(LeaveStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly permissionsStore = inject(CurrentUserPermissionsStore);

  readonly leaveTypes = this.#leaveStore.leaveTypes;
  readonly isLoadingTypes = this.#leaveStore.isLoadingTypes;

  protected get actionItems(): MenuItem[] {
    const items: MenuItem[] = [];
    if (this.permissionsStore.canPerform('Leaves', 'Update')) items.push({ label: 'Edit' });
    if (this.permissionsStore.canPerform('Leaves', 'Delete')) items.push({ label: 'Delete' });
    return items;
  }

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave Types',
      pageDescription: 'Manage leave types and default days',
      pageIcon: 'pi pi-tags',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Approval Inbox', routerLink: '/app/leave/inbox' },
      { label: 'Manage Leave Types' },
    ]);

    this.#leaveStore.loadLeaveTypes();
  }

  openNew(leaveType?: ILeaveType) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(LeaveTypesManageDialog, {
      header: leaveType ? 'Edit Leave Type' : 'Add Leave Type',
      modal: true,
      closable: true,
      style: { width: '90vw', maxWidth: '45rem' },
      contentStyle: { overflow: 'hidden' },
      data: { leaveType },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.#leaveStore.loadLeaveTypes();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteType(leaveType: ILeaveType) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete ${leaveType.leaveName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#leaveStore.deleteLeaveType(leaveType),
    });
  }
}
