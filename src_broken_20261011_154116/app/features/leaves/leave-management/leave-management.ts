import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { Table, TableModule } from '@openng/optimus-ui/table';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { Common } from '@core/services';
import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableInlineFilters } from '@shared/components/table-inline-filters/table-inline-filters';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { TableSearchFilter } from '@shared/components/table-search-filter/table-search-filter';
import { TableSearchInput } from '@shared/components/table/table-search-input/table-search-input';
import { ILeave, IUpcomingLeave } from '@shared/interfaces';

import { leaveStatusSeverity } from '../leave-status.util';
import { LeaveStore } from '../leave.store';
import LeavesStatsLoader from './leaves-stats-loader/leaves-stats-loader';
import LeavesStats from './leaves-stats/leaves-stats';
import RequestLeaveDialog from './request-leave-dialog/request-leave-dialog';

@Component({
  selector: 'app-leave-management',
  imports: [
    CardModule,
    ButtonModule,
    TableModule,
    BadgeModule,
    DatePipe,
    TooltipModule,
    LeavesStats,
    LeavesStatsLoader,
    TableLoader,
    TableEmptyMessage,
    TableInlineFilters,
    TableSearchFilter,
    TableSearchInput,
  ],
  templateUrl: './leave-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LeaveManagement {
  readonly #commonService = inject(Common);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #leaveStore = inject(LeaveStore);
  readonly upcomingLeaves = this.#leaveStore.upcomingLeaves;
  readonly leaveHistory = this.#leaveStore.leaveHistory;
  readonly isLoading = this.#leaveStore.isLoadingMyLeaves;
  readonly totalLeaves = this.#leaveStore.totalLeaves;
  readonly usedLeaves = this.#leaveStore.totalConsumed;
  readonly availableLeaves = this.#leaveStore.totalAvailable;
  readonly pendingRequestsCount = computed(() => this.#leaveStore.pendingRequests().length);

  constructor() {
    this.#commonService.setPageHeaderInfo({
      pageTitle: 'My Leave',
      pageDescription: 'Manage your leave balance and requests',
      pageIcon: 'pi pi-calendar-minus',
      isBreadcrumbShow: false,
    });

    this.#leaveStore.loadRequestedLeaves();

    this.#leaveStore.loadMyLeaves();
  }

  onRequestLeave(leave?: ILeave): void {
    const ref: DynamicDialogRef | null = this.#dialogService.open(RequestLeaveDialog, {
      header: !leave ? 'Apply for leave' : 'Edit leave request',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
      data: { leave },
    });

    ref?.onClose.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  onCancelLeave(leave: IUpcomingLeave): void {
    this.#leaveStore.deleteUpcomingLeave(leave.id);
    this.#commonService.showMessage('Leave cancelled successfully', 'success');
  }

  getDays(leave: ILeave) {
    return this.#leaveStore.getLeaveDaysCount(leave);
  }

  protected statusSeverity = leaveStatusSeverity;

  searchLeaves(dt: Table, value: string) {
    dt.filterGlobal(value, 'contains');
  }
}
