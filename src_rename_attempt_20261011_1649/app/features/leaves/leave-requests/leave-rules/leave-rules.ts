import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { ILeaveRule } from '@shared/interfaces';

import { LeaveStore } from '../../leave.store';
import { LeaveRuleDetailDrawer } from './leave-rule-detail-drawer/leave-rule-detail-drawer';
import LeaveRuleDialog from './leave-rule-dialog/leave-rule-dialog';

@Component({
  selector: 'app-leave-rules',
  imports: [
    ButtonModule,
    CardModule,
    TableModule,
    ConfirmDialogModule,
    MenuModule,
    LeaveRuleDetailDrawer,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchFilter,
  ],
  providers: [ConfirmationService],
  templateUrl: './leave-rules.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveRules {
  readonly #leaveStore = inject(LeaveStore);
  readonly #confirmationService = inject(ConfirmationService);
  readonly #dialogService = inject(DialogService);
  readonly #commonService = inject(Common);
  readonly #destroyRef = inject(DestroyRef);
  readonly permissionsStore = inject(CurrentUserPermissionsStore);

  readonly leaveRules = this.#leaveStore.leaveRules;
  readonly isLoading = this.#leaveStore.isLoadingRules;

  protected selectedLeaveRule = signal<ILeaveRule | undefined>(undefined);
  protected isShowDetail = false;

  protected get actionItems(): MenuItem[] {
    const items: MenuItem[] = [{ label: 'View' }];
    if (this.permissionsStore.canPerform('Leaves', 'Update')) items.push({ label: 'Edit' });
    if (this.permissionsStore.canPerform('Leaves', 'Delete')) items.push({ label: 'Delete' });
    return items;
  }

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave Rules',
      pageDescription: 'Manage leave policy rules',
      pageIcon: 'pi pi-sliders-h',
      isBreadcrumbShow: true,
    });

    this.#commonService.setBreadcrumbItems([
      { label: 'Approval Inbox', routerLink: '/app/leave/inbox' },
      { label: 'Manage Leave Rules' },
    ]);

    this.#leaveStore.loadLeaveTypes();
    this.#leaveStore.loadLeaveRules();
  }

  openNew(leaveRule?: ILeaveRule) {
    const ref: DynamicDialogRef | null = this.#dialogService.open(LeaveRuleDialog, {
      header: leaveRule ? 'Edit Leave Rule' : 'Add Leave Rule',
      modal: true,
      closable: true,
      focusOnShow: false,
      style: { width: '90vw', maxWidth: '45rem' },
      contentStyle: { overflow: 'hidden' },
      data: { leaveRule },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: boolean) => {
      if (result) {
        this.#leaveStore.loadLeaveRules();
      }
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  deleteType(leaveRule: ILeaveRule) {
    this.#confirmationService.confirm({
      message: `Are you sure you want to delete ${leaveRule.leaveTypeName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, delete',
      rejectLabel: 'No, cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.#leaveStore.deleteLeaveRule(leaveRule),
    });
  }

  onView(leaveRule: ILeaveRule) {
    this.isShowDetail = true;
    this.selectedLeaveRule.set(leaveRule);
  }
}
