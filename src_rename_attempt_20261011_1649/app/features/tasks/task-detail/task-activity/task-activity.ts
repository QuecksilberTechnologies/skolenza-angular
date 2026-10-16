import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TaskActivity } from '@shared/interfaces';

@Component({
  selector: 'app-task-activity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-zinc-200">Activity</h3>
      @if (activity().length) {
        <ol class="relative flex flex-col gap-4 border-l border-gray-200 pl-4 dark:border-zinc-700">
          @for (a of activity(); track a.id) {
            <li class="relative">
              <span class="absolute top-1 -left-[21px] size-2.5 rounded-full bg-primary-400"></span>
              <div class="text-sm text-gray-700 dark:text-zinc-200">
                <span class="font-medium">{{ a.actor }}</span>
                {{ a.action }}
                @if (a.detail) {
                  <span class="text-gray-400">— {{ a.detail }}</span>
                }
              </div>
              <div class="text-xs text-gray-400">{{ a.createdAt }}</div>
            </li>
          }
        </ol>
      } @else {
        <p class="text-sm text-gray-400">No activity recorded.</p>
      }
    </div>
  `,
})
export class TaskActivityTimeline {
  readonly activity = input.required<TaskActivity[]>();
}
