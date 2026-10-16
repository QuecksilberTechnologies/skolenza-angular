import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface PmsKpi {
  key: string;
  label: string;
  value: string | number;
  icon: string;
  link?: string;
}

@Component({
  selector: 'app-pms-kpi-cards',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:h-[7.4rem] lg:grid-cols-5">
      @for (kpi of kpis(); track kpi.key) {
        <a
          [routerLink]="kpi.link ?? null"
          class="flex items-center gap-3 rounded-xl border-0 bg-white p-4 text-left shadow transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:gap-4 dark:bg-zinc-900"
          [class.cursor-pointer]="!!kpi.link"
          [class.hover:shadow-md]="!!kpi.link"
          [class.cursor-default]="!kpi.link"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 sm:h-12 sm:w-12 dark:bg-primary-900/30"
          >
            <i
              [class]="kpi.icon"
              class="text-xl! text-primary-500 sm:text-2xl! dark:text-primary-200"
              aria-hidden="true"
            ></i>
          </div>
          <div class="flex flex-col">
            @if (loading()) {
              <span class="h-8 w-10 animate-pulse rounded bg-gray-200 dark:bg-zinc-700"></span>
            } @else {
              <span
                class="text-2xl leading-tight font-medium text-gray-900 tabular-nums sm:text-3xl dark:text-zinc-100"
              >
                {{ kpi.value }}
              </span>
            }
            <span class="text-sm font-medium text-gray-500 dark:text-zinc-400">
              {{ kpi.label }}
            </span>
          </div>
        </a>
      }
    </div>
  `,
})
export class PmsKpiCards {
  readonly kpis = input.required<PmsKpi[]>();
  readonly loading = input(false);
}
