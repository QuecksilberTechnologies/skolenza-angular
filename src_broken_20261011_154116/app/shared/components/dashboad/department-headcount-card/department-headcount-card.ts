import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { CardModule } from '@openng/optimus-ui/card';
import { TooltipModule } from '@openng/optimus-ui/tooltip';
import { Building2 } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { SuperAdminDepartmentHeadcount } from '@shared/interfaces';

interface DepartmentCount {
  id: number;
  name: string;
  count: number;
  colorClass: string;
  barClass: string;
  barWidth: number;
}

/** Bar colours, cycled in rank order. */
const PALETTE: Pick<DepartmentCount, 'colorClass' | 'barClass'>[] = [
  { colorClass: 'text-blue-500 dark:text-blue-400', barClass: 'bg-blue-400' },
  { colorClass: 'text-emerald-500 dark:text-emerald-400', barClass: 'bg-emerald-400' },
  { colorClass: 'text-violet-500 dark:text-violet-400', barClass: 'bg-violet-400' },
  { colorClass: 'text-amber-500 dark:text-amber-400', barClass: 'bg-amber-400' },
  { colorClass: 'text-rose-500 dark:text-rose-400', barClass: 'bg-rose-400' },
  { colorClass: 'text-orange-500 dark:text-orange-400', barClass: 'bg-orange-400' },
];

@Component({
  selector: 'app-department-headcount-card',
  imports: [CardModule, ButtonModule, TableEmptyMessage, TooltipModule, LucideAngularModule],
  templateUrl: './department-headcount-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentHeadcountCard {
  readonly title = input<string>();
  /** Already sorted by headcount, largest first. */
  readonly headcounts = input<SuperAdminDepartmentHeadcount[] | null>(null);
  readonly loading = input(false);
  readonly refresh = output<void>();

  protected readonly Building2 = Building2;
  protected readonly skeletonRows = [1, 2, 3, 4];

  protected readonly departments = computed<DepartmentCount[]>(() => {
    const rows = this.headcounts() ?? [];
    const max = Math.max(...rows.map((row) => row.headcount), 0);
    return rows.map((row, index) => ({
      id: row.departmentId,
      name: row.departmentName,
      count: row.headcount,
      ...PALETTE[index % PALETTE.length],
      barWidth: max ? Math.round((row.headcount / max) * 100) : 0,
    }));
  });

  protected readonly totalHeadcount = computed(() =>
    this.departments().reduce((sum, department) => sum + department.count, 0),
  );
}
