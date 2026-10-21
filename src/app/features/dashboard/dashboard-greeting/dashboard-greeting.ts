import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CloudSun, LucideAngularModule, Moon, Sun, Sunrise } from 'lucide-angular';

import { AuthStore } from '@core/stores';

/** Greeting and icon for the hour of day; the first range containing the hour wins. */
const PERIODS = [
  { until: 5, greeting: 'Good Night', icon: Moon },
  { until: 12, greeting: 'Good Morning', icon: Sunrise },
  { until: 17, greeting: 'Good Afternoon', icon: Sun },
  { until: 21, greeting: 'Good Evening', icon: CloudSun },
  { until: 24, greeting: 'Good Night', icon: Moon },
];

/** The time-of-day banner at the top of a role dashboard. */
@Component({
  selector: 'app-dashboard-greeting',
  imports: [LucideAngularModule],
  template: `
    <div
      class="flex items-center justify-between gap-4 rounded-card bg-primary-50 px-6 py-5 shadow-sm dark:border dark:border-zinc-800 dark:bg-primary-900/30 dark:shadow-none"
    >
      <div class="min-w-0">
        <h2 class="m-0 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {{ period().greeting }}, {{ firstName() }}
        </h2>
        <!-- zinc-600, not the usual muted zinc-500: on a red brand's tint zinc-500 is 4.43:1 -->
        <p class="mt-1 mb-0 text-sm text-zinc-600 dark:text-zinc-400">{{ subtitle() }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-4">
        <ng-content />
        <lucide-angular
          [img]="period().icon"
          size="36"
          class="hidden text-primary/20 sm:block"
          aria-hidden="true"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGreeting {
  readonly #authStore = inject(AuthStore);

  readonly subtitle = input.required<string>();

  protected readonly firstName = computed(
    () => this.#authStore.staffMemberFullName().split(' ')[0],
  );
  protected readonly period = computed(() => {
    const hour = new Date().getHours();
    return PERIODS.find((period) => hour < period.until) ?? PERIODS[0];
  });
}
