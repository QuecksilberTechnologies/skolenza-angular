import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IOkrActivity } from '@shared/interfaces';

@Component({
  selector: 'app-okr-timeline',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (activities().length) {
      <ol class="relative ml-3 border-l-2 border-gray-100 dark:border-zinc-800">
        @for (act of activities(); track act.id) {
          <li class="mb-5 ml-4 last:mb-0">
            <span
              class="absolute -left-[0.4375rem] mt-1 h-3 w-3 rounded-full bg-primary-500 ring-4 ring-white dark:ring-zinc-900"
            ></span>
            <p class="text-sm text-gray-800 dark:text-zinc-100">
              <strong class="font-medium">{{ act.actor }}</strong>
              {{ act.action }}
              @if (act.detail) {
                <span class="text-text-secondary-light dark:text-text-secondary-dark">
                  ({{ act.detail }})
                </span>
              }
            </p>
            <time
              class="mt-0.5 block text-xs text-text-secondary-light dark:text-text-secondary-dark"
            >
              {{ act.createdAt | date: 'medium' }}
            </time>
          </li>
        }
      </ol>
    } @else {
      <p class="text-sm text-text-secondary-light dark:text-text-secondary-dark">
        No activity yet.
      </p>
    }
  `,
})
export class OkrTimeline {
  readonly activities = input.required<IOkrActivity[]>();
}
