import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from '@openng/optimus-ui/api';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { CardModule } from '@openng/optimus-ui/card';
import { OverlayBadgeModule } from '@openng/optimus-ui/overlaybadge';
import { SplitButtonModule } from '@openng/optimus-ui/splitbutton';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TieredMenu } from '@openng/optimus-ui/tieredmenu';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableActionButton } from '@shared/components/table/table-action-button/table-action-button';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { ILeave, ILeaveRequest, LoginInfo } from '@shared/interfaces';

import { leaveStatusSeverity } from '../leave-status.util';
import { LeaveStore } from '../leave.store';

@Component({
  selector: 'app-leave-requests',
  imports: [
    UserAvatar,
    CardModule,
    TableModule,
    BadgeModule,
    SplitButtonModule,
    OverlayBadgeModule,
    TieredMenu,
    DatePipe,
    TooltipModule,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchFilter,
    TableSearchInput,
    TableActionButton,
  ],
  templateUrl: './leave-requests.html',
  styleUrl: './leave-requests.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveRequests implements OnInit {
  readonly #commonService = inject(Common);
  readonly #router = inject(Router);
  readonly #leaveStore = inject(LeaveStore);
  readonly permissionsStore = inject(CurrentUserPermissionsStore);
  readonly leaveRequests = this.#leaveStore.leaveRequests;
  readonly totalRecords = this.#leaveStore.totalRequestRecords;
  readonly isLoading = this.#leaveStore.isLoadingRequests;
  protected loginInfo!: LoginInfo;
  protected selectedLeave: ILeaveRequest | null = null;

  protected get rowActionItems(): MenuItem[] {
    const leave = this.selectedLeave;
    if (!leave || leave.isAccepted || leave.isRejected) return [];

    const items: MenuItem[] = [];
    if (this.permissionsStore.canPerform('Leaves', 'Approve')) {
      items.push({
        label: 'Approve',
        icon: 'pi pi-check !text-green-500',
        command: () => this.acceptLeave(leave),
      });
    }
    if (this.permissionsStore.canPerform('Leaves', 'Reject')) {
      if (items.length) items.push({ separator: true });
      items.push({
        label: 'Reject',
        icon: 'pi pi-times !text-red-500',
        styleClass: '!text-red-500 dark:!text-red-400 font-medium',
        command: () => this.rejectLeave(leave),
      });
    }
    return items;
  }

  protected primaryActionItems: MenuItem[] = [
    {
      label: 'Leave Types',
      icon: 'pi pi-tags',
      routerLink: ['/app/leave/types'],
    },
    { separator: true },
    {
      label: 'Leave Rules',
      icon: 'pi pi-sliders-h',
      routerLink: ['/app/leave/rules'],
    },
  ];

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Approval Inbox',
      pageDescription: 'Approve or reject pending leave requests',
      pageIcon: 'pi pi-inbox',
    });

    this.#leaveStore.loadRequestedLeaves();
  }

  async ngOnInit() {
    this.loginInfo = await this.#commonService.getLoginInfo();
  }

  acceptLeave(leaveRequest: ILeaveRequest) {
    this.#leaveStore.approveLeaveRequest(leaveRequest.id);
  }

  rejectLeave(leaveRequest: ILeaveRequest) {
    this.#leaveStore.rejectLeaveRequest(leaveRequest.id);
  }

  onLeaveBalances() {
    this.#router.navigate(['/app/leave/balances']);
  }

  getDays(leave: ILeave) {
    return this.#leaveStore.getLeaveDaysCount(leave);
  }

  protected statusSeverity = leaveStatusSeverity;

  searchLeaves(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }
}
