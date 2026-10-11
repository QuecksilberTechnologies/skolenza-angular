import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { ProfileEmpty, ProfileLoader } from '@shared/index';
import { ILeaveTypeCard } from '@shared/interfaces';

import RequestLeaveDialog from '../../../leaves/leave-management/request-leave-dialog/request-leave-dialog';
import { LeaveStore } from '../../../leaves/leave.store';
import { LeaveHistory } from './leave-history/leave-history';
import { UpcomingLeaves } from './upcoming-leaves/upcoming-leaves';

@Component({
  selector: 'app-staff-member-leave-info',
  imports: [
    CardModule,
    ButtonModule,
    TooltipModule,
    ProfileLoader,
    ProfileEmpty,
    UpcomingLeaves,
    LeaveHistory,
  ],
  templateUrl: './staff-member-leave-info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class StaffMemberLeaveInfo implements OnInit {
  readonly #leaveStore = inject(LeaveStore);
  readonly #dialogService = inject(DialogService);
  readonly #destroyRef = inject(DestroyRef);

  readonly leaveTypes = this.#leaveStore.leaveTypeCards;
  readonly upcomingLeaves = this.#leaveStore.upcomingLeaves;
  readonly leaveHistory = this.#leaveStore.leaveHistory;
  readonly isLoading = this.#leaveStore.isLoadingMyLeaves;

  readonly hasData = computed(() => this.leaveTypes().length > 0);

  readonly summary = computed(() => [
    { label: 'Available', value: this.#leaveStore.totalAvailable() },
    { label: 'Used', value: this.#leaveStore.totalConsumed() },
    { label: 'Total', value: this.#leaveStore.totalLeaves() },
  ]);

  ngOnInit() {
    this.#leaveStore.loadMyLeaves();
  }

  reload() {
    this.#leaveStore.loadMyLeaves();
  }

  applyLeave() {
    const ref = this.#dialogService.open(RequestLeaveDialog, {
      header: 'Apply for leave',
      style: { width: '90vw', maxWidth: '50rem' },
      contentStyle: { overflow: 'hidden' },
      modal: true,
      closable: true,
      focusOnShow: false,
    });

    this.#destroyRef.onDestroy(() => ref?.close());
  }

  usedPercent(leaveType: ILeaveTypeCard): number {
    if (!leaveType.total) return 0;
    return Math.min(100, Math.round(((leaveType.consumed ?? 0) / leaveType.total) * 100));
  }

  dayLabel(count: number): string {
    return count === 1 ? 'day' : 'days';
  }

  formatConsumed(consumed: number | null): string {
    const value = consumed ?? 0;
    return `${value} ${this.dayLabel(value)}`;
  }
}
