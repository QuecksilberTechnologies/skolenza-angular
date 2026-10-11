import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { TaskStats } from '@shared/interfaces';

interface Kpi {
  key: keyof TaskStats;
  label: string;
  icon: string;
}

const KPIS: Kpi[] = [
  { key: 'today', label: 'Due Today', icon: 'pi pi-calendar' },
  { key: 'upcoming', label: 'Upcoming', icon: 'pi pi-forward' },
  { key: 'overdue', label: 'Overdue', icon: 'pi pi-exclamation-triangle' },
  { key: 'inProgress', label: 'In Progress', icon: 'pi pi-spinner' },
  { key: 'pendingReview', label: 'Pending Review', icon: 'pi pi-search' },
  { key: 'completed', label: 'Completed', icon: 'pi pi-check-circle' },
];

@Component({
  selector: 'app-task-kpi-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule],
  template: `
    <div class="flex flex-wrap gap-4 md:gap-4">
      @for (kpi of kpis; track kpi.key) {
        <p-card
          class="h-[7.4rem] max-w-full min-w-[calc(50%-0.5rem)] flex-1 rounded-xl border-0 bg-white shadow sm:max-w-[calc(50%-0.5rem)] sm:min-w-[180px] lg:max-w-none dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex items-center gap-3 p-2 sm:gap-4">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 sm:h-12 sm:w-12 dark:bg-primary-900/30"
            >
              <i
                [class]="kpi.icon"
                class="text-xl! text-primary-500 sm:text-2xl! dark:text-primary-200"
              ></i>
            </div>
            <div class="flex flex-col">
              <span
                class="text-2xl! leading-tight font-medium text-gray-900 sm:text-3xl! dark:text-zinc-100"
              >
                {{ stats()[kpi.key] }}
              </span>
              <span class="text-sm font-medium text-gray-500 sm:text-base dark:text-zinc-400">
                {{ kpi.label }}
              </span>
            </div>
          </div>
        </p-card>
      }
    </div>
  `,
})
export class TaskKpiCards {
  readonly stats = input.required<TaskStats>();
  protected readonly kpis = KPIS;
}
