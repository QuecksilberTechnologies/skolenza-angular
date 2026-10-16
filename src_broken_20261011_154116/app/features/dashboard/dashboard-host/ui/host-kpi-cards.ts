import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface HostKpi {
  key: string;
  label: string;
  value: string | number;
  icon: string;
  link: string;
}

/**
 * KPI strip for the host dashboard. Every card links to its list page.
 * Card size and styling mirror the staffMembers page stat cards (`staffMember-stats.html`).
 */
@Component({
  selector: 'app-host-kpi-cards',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-4" [attr.aria-busy]="loading()">
      @for (kpi of kpis(); track kpi.key) {
        <a
          [routerLink]="kpi.link"
          [attr.aria-label]="loading() ? kpi.label + ', loading' : kpi.label + ': ' + kpi.value"
          class="flex h-[7.4rem] max-w-full min-w-[calc(50%-0.5rem)] flex-1 cursor-pointer items-center gap-3 rounded-xl border-0 bg-white px-5 text-left shadow ring-offset-white transition-shadow duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none sm:max-w-[calc(50%-0.5rem)] sm:min-w-[180px] sm:gap-4 lg:max-w-none dark:border-zinc-800 dark:bg-zinc-900 dark:ring-offset-zinc-950"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 sm:h-12 sm:w-12 dark:bg-primary-900/30"
          >
            <i
              [class]="kpi.icon"
              class="text-xl! text-primary-500 sm:text-2xl! dark:text-primary-200"
            ></i>
          </div>
          <div class="flex min-w-0 flex-col">
            @if (loading()) {
              <span
                class="h-8 w-12 animate-pulse rounded bg-gray-200 motion-reduce:animate-none dark:bg-zinc-700"
                aria-hidden="true"
              ></span>
            } @else {
              <span
                class="text-2xl! leading-tight font-medium text-gray-900 tabular-nums sm:text-3xl! dark:text-zinc-100"
              >
                {{ kpi.value }}
              </span>
            }
            <span
              class="truncate text-sm font-medium text-gray-500 sm:text-base dark:text-zinc-400"
            >
              {{ kpi.label }}
            </span>
          </div>
        </a>
      }
    </div>
  `,
})
export class HostKpiCards {
  readonly kpis = input.required<HostKpi[]>();
  readonly loading = input(false);
}
