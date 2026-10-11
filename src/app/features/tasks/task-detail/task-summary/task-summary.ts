import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Task } from '@shared/interfaces';

import { isOverdue } from '../../tasks-nav';
import { TaskProgress } from '../../ui/task-progress';

@Component({
  selector: 'app-task-summary',
  imports: [DatePipe, TaskProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4">
      @if (task().description) {
        <p class="text-sm whitespace-pre-line text-gray-600 dark:text-zinc-300">
          {{ task().description }}
        </p>
      }

      <app-task-progress [value]="task().progress" />

      <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt class="text-xs text-gray-400">Assignee</dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">
            {{ task().assigneeName }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-400">Reporter</dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">
            {{ task().reporterName }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-400">Category</dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">{{ task().category }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-400">Start</dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">
            {{ task().startDate | date: 'MMM d, y' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-400">Due</dt>
          <dd
            class="font-medium"
            [class.text-red-500]="overdue()"
            [class.text-gray-800]="!overdue()"
            [class.dark:text-zinc-100]="!overdue()"
          >
            {{ task().dueDate | date: 'MMM d, y' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-400">Completed</dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">
            {{ task().completedDate ? (task().completedDate | date: 'MMM d, y') : '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-400">Estimated</dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">{{ task().estimatedHours }}h</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-400">Actual</dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">{{ task().actualHours }}h</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-400">Recurring</dt>
          <dd class="font-medium text-gray-900 dark:text-zinc-100">
            {{ task().isRecurring ? 'Yes' : 'No' }}
          </dd>
        </div>
      </dl>

      @if (task().tags.length) {
        <div class="flex flex-wrap gap-1.5">
          @for (tag of task().tags; track tag) {
            <span
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-zinc-700 dark:text-zinc-300"
            >
              #{{ tag }}
            </span>
          }
        </div>
      }
    </div>
  `,
})
export class TaskSummary {
  readonly task = input.required<Task>();
  protected readonly overdue = computed(() => isOverdue(this.task()));
}
