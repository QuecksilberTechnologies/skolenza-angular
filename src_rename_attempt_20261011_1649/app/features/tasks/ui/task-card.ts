import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TooltipModule } from '@openng/optimus-ui/tooltip';

import { UserAvatar } from '@shared/components/user-avatar/user-avatar';
import { Task } from '@shared/interfaces';

import { isOverdue } from '../tasks-nav';
import { TaskPriorityBadge } from './task-priority-badge';
import { TaskProgress } from './task-progress';

@Component({
  selector: 'app-task-card',
  imports: [UserAvatar, DatePipe, TooltipModule, TaskPriorityBadge, TaskProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="open.emit(task())"
      class="flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors transition-shadow hover:border-primary-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div class="flex items-start justify-between gap-2">
        <span class="line-clamp-2 text-base font-semibold text-gray-900 dark:text-zinc-100">
          {{ task().title }}
        </span>
        <app-task-priority-badge [priority]="task().priority" />
      </div>

      @if (task().tags.length) {
        <div class="flex flex-wrap gap-1">
          @for (tag of task().tags.slice(0, 3); track tag) {
            <span
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-zinc-700 dark:text-zinc-300"
            >
              #{{ tag }}
            </span>
          }
          @if (task().tags.length > 3) {
            <span
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1 text-[10px] font-semibold text-gray-700 dark:bg-zinc-700 dark:text-zinc-200"
            >
              +{{ task().tags.length - 3 }}
            </span>
          }
        </div>
      }

      @if (task().progress > 0) {
        <app-task-progress [value]="task().progress" />
      }

      <div class="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-400">
        <span [pTooltip]="task().assigneeName" class="flex min-w-0 items-center gap-1.5">
          <app-user-avatar
            class="shrink-0"
            [name]="task().assigneeName"
            avatarClass="h-7! w-7! text-xs!"
          />
          <span class="truncate">{{ task().assigneeName }}</span>
        </span>
        <span
          class="flex shrink-0 items-center gap-1"
          [class.text-red-500]="overdue()"
          [class.font-semibold]="overdue()"
          [pTooltip]="overdue() ? 'Overdue' : ''"
        >
          <i
            class="pi text-xs"
            [class.pi-calendar]="!overdue()"
            [class.pi-exclamation-circle]="overdue()"
          ></i>
          {{ task().dueDate | date: 'MMM d' }}
        </span>
      </div>
    </button>
  `,
})
export class TaskCard {
  readonly task = input.required<Task>();
  readonly open = output<Task>();
  protected readonly overdue = computed(() => isOverdue(this.task()));
}
