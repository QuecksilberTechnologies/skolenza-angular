import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  LOCALE_ID,
  inject,
} from '@angular/core';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { SuperAdminLeave } from '@shared/interfaces';

import { DashboardCard } from '../dashboard-card/dashboard-card';

interface OnLeaveEntry {
  id: string;
  name: string;
  department: string;
  dateRange: string;
  phone: string;
  avatar: string | null;
}

@Component({
  selector: 'app-on-leave-card',
  imports: [DashboardCard, TableEmptyMessage, UserAvatar],
  templateUrl: './on-leave-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnLeaveCardComponent {
  readonly #locale = inject(LOCALE_ID);

  title = input<string>();
  /**
   * StaffMembers on approved leave today. Left unset (the StaffMember dashboard, which has no API for
   * it yet), the card keeps showing its sample rows.
   */
  leaves = input<SuperAdminLeave[] | null | undefined>(undefined);
  loading = input(false);

  protected readonly skeletonRows = [1, 2];

  // Mock data for StaffMember/On Leave
  readonly #mockStaffMembers: OnLeaveEntry[] = [
    {
      id: 'mock-1',
      name: 'Amit Sharma',
      department: 'IT Department',
      dateRange: '15 Mar 2025 - 20 Mar 2025',
      phone: '+91 9876543210',
      avatar:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&fit=crop&crop=face',
    },
    {
      id: 'mock-2',
      name: 'Neha Singh',
      department: 'HR Department',
      dateRange: '18 Mar 2025 - 22 Mar 2025',
      phone: '+91 9988776655',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face',
    },
  ];

  protected readonly staffMembers = computed<OnLeaveEntry[]>(() => {
    const leaves = this.leaves();
    if (leaves === undefined) return this.#mockStaffMembers;

    return (leaves ?? []).map((leave) => ({
      id: `${leave.staffMemberId}-${leave.fromDate}`,
      name: leave.staffMemberName,
      department: leave.departmentName ?? '',
      dateRange: `${this.#formatDay(leave.fromDate)} - ${this.#formatDay(leave.toDate)}`,
      phone: leave.mobileNumber ?? '',
      avatar: null,
    }));
  });

  #formatDay(date: string): string {
    return formatDate(date, 'd MMM y', this.#locale);
  }
}
