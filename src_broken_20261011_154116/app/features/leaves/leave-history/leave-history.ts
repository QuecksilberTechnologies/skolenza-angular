import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { CardModule } from '@openng/optimus-ui/card';
import { SelectModule } from '@openng/optimus-ui/select';
import { TableModule } from '@openng/optimus-ui/table';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { ILeaveRequest } from '@shared/interfaces';

import { leaveStatusSeverity } from '../leave-status.util';
import { LeaveStore } from '../leave.store';

type StatusFilter = 'all' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

interface StatusOption {
  label: string;
  value: StatusFilter;
}

@Component({
  selector: 'app-leave-history',
  imports: [
    CardModule,
    TableModule,
    BadgeModule,
    SelectModule,
    FormsModule,
    DatePipe,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
  ],
  templateUrl: './leave-history.html',
  styleUrl: './leave-history.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveHistory {
  readonly #commonService = inject(Common);
  readonly #leaveStore = inject(LeaveStore);

  readonly isLoading = this.#leaveStore.isLoadingRequests;

  protected readonly statusOptions: StatusOption[] = [
    { label: 'All statuses', value: 'all' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  protected selectedStatus = signal<StatusFilter>('all');

  protected readonly leaveHistory = computed<ILeaveRequest[]>(() => {
    const all = this.#leaveStore.leaveRequests();
    const filter = this.selectedStatus();
    if (filter === 'all') return all;
    return all.filter((r) => r.statusText === filter);
  });

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'Leave History',
      pageDescription: 'View all team leave requests and outcomes',
      pageIcon: 'pi pi-history',
    });

    this.#leaveStore.loadRequestedLeaves();
  }

  getDays(leave: ILeaveRequest): number {
    return this.#leaveStore.getLeaveDaysCount(leave);
  }

  protected statusSeverity = leaveStatusSeverity;
}
