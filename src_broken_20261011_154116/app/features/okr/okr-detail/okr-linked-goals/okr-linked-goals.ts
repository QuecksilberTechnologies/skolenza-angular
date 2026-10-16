import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CardModule } from '@openng/optimus-ui/card';

import { ILinkedGoal } from '@shared/interfaces';

import { OkrLevelBadge } from '../../ui/okr-level-badge';

@Component({
  selector: 'app-okr-linked-goals',
  imports: [CardModule, OkrLevelBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card class="block">
      <div class="mb-4 flex items-center gap-2">
        <i class="pi pi-link text-sm text-primary-500" aria-hidden="true"></i>
        <h2 class="text-sm font-semibold tracking-wide text-gray-900 dark:text-zinc-100">
          Linked Goals
        </h2>
      </div>
      @if (goals().length) {
        <ul class="flex flex-col gap-2">
          @for (goal of goals(); track goal.id) {
            <li>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left transition hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                (click)="open.emit(goal.id)"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <app-okr-level-badge [level]="goal.level" />
                  <span class="truncate text-sm text-gray-800 dark:text-zinc-100">
                    {{ goal.title }}
                  </span>
                </span>
                <span class="flex shrink-0 items-center gap-2">
                  <span class="text-xs font-semibold text-gray-700 tabular-nums dark:text-zinc-200">
                    {{ goal.progress }}%
                  </span>
                  <i class="pi pi-angle-right text-gray-400" aria-hidden="true"></i>
                </span>
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          No linked goals.
        </p>
      }
    </p-card>
  `,
})
export class OkrLinkedGoals {
  readonly goals = input.required<ILinkedGoal[]>();
  readonly open = output<string>();
}
