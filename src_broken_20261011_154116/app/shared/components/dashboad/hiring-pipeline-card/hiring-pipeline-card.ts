import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';
import { BriefcaseBusiness, LucideAngularModule } from 'lucide-angular';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { SuperAdminHiringPipeline } from '@shared/interfaces';

import { DashboardCardHeader } from '../dashboard-card-header/dashboard-card-header';

interface PipelineStage {
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
  barBg: string;
  widthPercent: number;
  conversionRate: string | null;
}

type StageStyle = Pick<PipelineStage, 'colorClass' | 'bgClass' | 'barBg'>;

/** Funnel colours, cycled in stage order. */
const PALETTE: StageStyle[] = [
  {
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    barBg: 'bg-blue-400/20 dark:bg-blue-400/10',
  },
  {
    colorClass: 'text-violet-600 dark:text-violet-400',
    bgClass: 'bg-violet-50 dark:bg-violet-900/20',
    barBg: 'bg-violet-400/20 dark:bg-violet-400/10',
  },
  {
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    barBg: 'bg-amber-400/20 dark:bg-amber-400/10',
  },
  {
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-900/20',
    barBg: 'bg-orange-400/20 dark:bg-orange-400/10',
  },
  {
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    barBg: 'bg-emerald-400/20 dark:bg-emerald-400/10',
  },
];

@Component({
  selector: 'app-hiring-pipeline-card',
  imports: [CardModule, DashboardCardHeader, TableEmptyMessage, LucideAngularModule],
  templateUrl: './hiring-pipeline-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HiringPipelineCard {
  readonly title = input<string>();
  readonly pipeline = input<SuperAdminHiringPipeline | null>(null);
  /** The backend still fakes this card's values. */
  readonly placeholder = input(false);
  readonly loading = input(false);
  readonly refresh = output<void>();

  protected readonly skeletonRows = [1, 2, 3];

  protected readonly BriefcaseBusiness = BriefcaseBusiness;

  protected readonly totalApplicants = computed(() => this.pipeline()?.totalApplicants ?? 0);

  protected readonly stages = computed<PipelineStage[]>(() => {
    const raw = this.pipeline()?.stages ?? [];
    const max = raw[0]?.count ?? 0;
    return raw.map((stage, i) => {
      const previous = raw[i - 1]?.count;
      return {
        label: stage.stage,
        count: stage.count,
        ...PALETTE[i % PALETTE.length],
        widthPercent: Math.max(max ? Math.round((stage.count / max) * 100) : 0, 20),
        conversionRate: i > 0 && previous ? `${Math.round((stage.count / previous) * 100)}%` : null,
      };
    });
  });
}
