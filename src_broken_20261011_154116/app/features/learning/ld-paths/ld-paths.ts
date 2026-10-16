import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TableEmptyMessage } from '@shared/components/table-empty-message/table-empty-message';
import { TableLoader } from '@shared/components/table-loader/table-loader';
import { LearningStatus } from '@shared/interfaces';

import { LearningPathStore } from '../store/learning-path.store';
import { LdProgressBar } from '../ui/ld-progress-bar';

@Component({
  selector: 'app-ld-paths',
  imports: [TableLoader, TableEmptyMessage, LdProgressBar],
  providers: [LearningPathStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.isLoading()) {
      <app-table-loader />
    } @else if (!store.paths().length) {
      <app-table-empty-message
        icon="pi pi-sitemap"
        message="No learning paths"
        subMessage="Role-based roadmaps will appear here."
      />
    } @else {
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        @for (path of store.paths(); track path.id) {
          <article
            class="flex flex-col rounded-xl border border-border-light bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="mb-3 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="text-base font-semibold text-gray-900 dark:text-zinc-100">
                  {{ path.title }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-zinc-400">{{ path.role }}</p>
              </div>
              <span
                class="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
              >
                {{ path.estimatedHours }}h
              </span>
            </div>

            <p class="mb-3 text-sm text-gray-600 dark:text-zinc-300">{{ path.description }}</p>

            <app-ld-progress-bar [value]="path.progress" [label]="path.title + ' progress'" />

            <ol class="mt-4 flex flex-col gap-0">
              @for (step of path.steps; track step.id; let last = $last) {
                <li class="relative flex gap-3 pb-4" [class.pb-0]="last">
                  @if (!last) {
                    <span
                      class="absolute top-6 left-[0.7rem] h-full w-px bg-border-light dark:bg-zinc-700"
                      aria-hidden="true"
                    ></span>
                  }
                  <span
                    class="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
                    [class]="stepClass(step.status)"
                  >
                    <i [class]="stepIcon(step.status)" aria-hidden="true"></i>
                  </span>
                  <div class="flex flex-1 items-center justify-between gap-2">
                    <span
                      class="text-sm"
                      [class]="
                        step.status === 'Completed'
                          ? 'text-gray-400 line-through dark:text-zinc-500'
                          : 'text-gray-800 dark:text-zinc-200'
                      "
                    >
                      {{ step.title }}
                    </span>
                    <span class="text-xs text-gray-400 tabular-nums">
                      {{ step.durationHours }}h
                    </span>
                  </div>
                </li>
              }
            </ol>
          </article>
        }
      </div>
    }
  `,
})
export default class LdPaths {
  protected readonly store = inject(LearningPathStore);

  protected stepIcon(status: LearningStatus): string {
    return status === 'Completed'
      ? 'pi pi-check'
      : status === 'InProgress'
        ? 'pi pi-spinner'
        : 'pi pi-circle';
  }

  protected stepClass(status: LearningStatus): string {
    return status === 'Completed'
      ? 'bg-green-500 text-white'
      : status === 'InProgress'
        ? 'bg-primary-500 text-white'
        : 'border border-border-light bg-white text-gray-400 dark:border-zinc-700 dark:bg-zinc-900';
  }
}
