import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { Plane, UserCheck, Users, UserX } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { SuperAdminStaffMemberOverview } from '@shared/interfaces';

interface StatSegment {
  label: string;
  count: number;
  icon: typeof Users;
  colorClass: string;
  bgClass: string;
  strokeClass: string;
  percent: number;
  dashOffset: number;
  dashArray: string;
}

@Component({
  selector: 'app-staff-member-stats-card',
  imports: [CardModule, ButtonModule, TableEmptyMessage, TooltipModule, LucideAngularModule],
  templateUrl: './staff-member-stats-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberStatsCard {
  readonly title = input<string>();
  readonly statistics = input<SuperAdminStaffMemberOverview | null>(null);
  readonly loading = input(false);
  readonly refresh = output<void>();

  protected readonly skeletonRows = [1, 2, 3];

  protected readonly Users = Users;

  protected readonly totalCount = computed(() => this.statistics()?.total ?? 0);

  protected readonly segments = computed<StatSegment[]>(() => {
    const s = this.statistics();
    const total = s?.total || 1;
    const circumference = 2 * Math.PI * 54;
    const gap = 4;

    const raw = [
      {
        label: 'Active',
        count: s?.active ?? 0,
        icon: UserCheck,
        colorClass: 'text-emerald-500 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
        strokeClass: 'stroke-emerald-400',
      },
      {
        label: 'Inactive',
        count: s?.inactive ?? 0,
        icon: UserX,
        colorClass: 'text-red-500 dark:text-red-400',
        bgClass: 'bg-red-50 dark:bg-red-900/30',
        strokeClass: 'stroke-red-400',
      },
      {
        label: 'On Leave',
        count: s?.onLeave ?? 0,
        icon: Plane,
        colorClass: 'text-amber-500 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-900/30',
        strokeClass: 'stroke-amber-400',
      },
    ];

    let offset = 0;
    return raw.map((item) => {
      const percent = Math.round((item.count / total) * 100);
      const arcLength = (item.count / total) * circumference - gap;
      const seg: StatSegment = {
        ...item,
        percent,
        dashOffset: -offset,
        dashArray: `${Math.max(arcLength, 0)} ${circumference}`,
      };
      offset += (item.count / total) * circumference;
      return seg;
    });
  });
}
