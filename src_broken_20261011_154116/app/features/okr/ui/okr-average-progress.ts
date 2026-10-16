import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { OkrProgress } from './okr-progress';

@Component({
  selector: 'app-okr-average-progress',
  imports: [CardModule, OkrProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card
      class="rounded-xl border-0 bg-white shadow dark:border-zinc-800 dark:bg-zinc-900"
      styleClass="h-full [&_.p-card-body]:h-full [&_.p-card-body]:flex [&_.p-card-body]:flex-col [&_.p-card-content]:h-full [&_.p-card-content]:flex [&_.p-card-content]:flex-col"
    >
      <div class="flex flex-1 flex-col">
        <h2 class="text-xl font-semibold text-color-emphasis dark:text-zinc-100">
          Average Progress
        </h2>
        <p class="mb-4 text-sm text-gray-500 dark:text-zinc-400">
          Across {{ objectiveCount() }} objectives
        </p>
        <div class="flex flex-1 flex-col justify-center py-4">
          <div class="mb-3 flex items-end gap-2">
            <span class="text-5xl leading-none font-bold tabular-nums">{{ progress() }}</span>
            <span class="pb-1 text-xl font-semibold text-gray-400 dark:text-zinc-500">%</span>
          </div>
          <app-okr-progress [value]="progress()" [showLabel]="false" />
        </div>

        <div class="border-t border-gray-100 pt-5 dark:border-zinc-800">
          <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <button
              type="button"
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 font-medium transition hover:border-primary-300 hover:bg-primary-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-zinc-700 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10"
              (click)="navigate.emit('/app/okr/my')"
            >
              <i class="pi pi-user text-gray-400 dark:text-zinc-500" aria-hidden="true"></i>
              My OKRs
            </button>
            @if (canManage()) {
              <button
                type="button"
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 font-medium transition hover:border-primary-300 hover:bg-primary-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-zinc-700 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10"
                (click)="navigate.emit('/app/okr/team')"
              >
                <i class="pi pi-users text-gray-400 dark:text-zinc-500" aria-hidden="true"></i>
                Team OKRs
              </button>
            }
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 font-medium transition hover:border-primary-300 hover:bg-primary-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-zinc-700 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10"
              (click)="navigate.emit('/app/okr/company')"
            >
              <i class="pi pi-building text-gray-400 dark:text-zinc-500" aria-hidden="true"></i>
              Company OKRs
            </button>
            @if (canManage()) {
              <button
                type="button"
                class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 font-semibold text-primary-700 transition hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300 dark:hover:bg-primary-500/20"
                (click)="navigate.emit('/app/okr/create?from=dashboard')"
              >
                <i class="pi pi-plus" aria-hidden="true"></i>
                New OKR
              </button>
            }
          </div>
        </div>
      </div>
    </p-card>
  `,
})
export class OkrAverageProgress {
  readonly progress = input.required<number>();
  readonly objectiveCount = input.required<number>();
  readonly canManage = input<boolean>(false);

  readonly navigate = output<string>();
}
