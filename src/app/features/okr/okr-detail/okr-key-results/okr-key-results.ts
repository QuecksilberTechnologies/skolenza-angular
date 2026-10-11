import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IKeyResult } from '@shared/interfaces';

import { OkrProgress } from '../../ui/okr-progress';

@Component({
  selector: 'app-okr-key-results',
  imports: [OkrProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3.5">
      @for (kr of keyResults(); track kr.id) {
        <div
          class="rounded-xl border border-l-4 border-gray-200 bg-white p-4 transition hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40"
          [class]="accentClass(kr.progress)"
        >
          <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span class="font-medium text-gray-900 dark:text-zinc-100">{{ kr.title }}</span>
            <span
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums dark:bg-zinc-800 dark:text-zinc-300"
            >
              Weight {{ kr.weight }}%
            </span>
          </div>
          <div class="mb-3 flex flex-wrap gap-1.5">
            <span
              class="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs text-text-secondary-light dark:bg-zinc-800 dark:text-text-secondary-dark"
            >
              Metric:
              <strong class="text-gray-700 dark:text-zinc-200">{{ kr.metric }}</strong>
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs text-text-secondary-light dark:bg-zinc-800 dark:text-text-secondary-dark"
            >
              Target:
              <strong class="text-gray-700 tabular-nums dark:text-zinc-200">
                {{ kr.target }} {{ kr.unit }}
              </strong>
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs text-text-secondary-light dark:bg-zinc-800 dark:text-text-secondary-dark"
            >
              Current:
              <strong class="text-gray-700 tabular-nums dark:text-zinc-200">
                {{ kr.current }} {{ kr.unit }}
              </strong>
            </span>
          </div>
          <app-okr-progress [value]="kr.progress" />
        </div>
      }
    </div>
  `,
})
export class OkrKeyResults {
  readonly keyResults = input.required<IKeyResult[]>();

  /** Left accent border colored by progress — mirrors okr-progress thresholds. */
  protected accentClass(progress: number): string {
    if (progress >= 100) return 'border-l-emerald-500';
    if (progress >= 70) return 'border-l-green-500';
    if (progress >= 40) return 'border-l-amber-500';
    return 'border-l-red-500';
  }
}
