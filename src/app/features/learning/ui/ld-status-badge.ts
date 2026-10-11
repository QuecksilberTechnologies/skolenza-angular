import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { LearningStatus } from '@shared/interfaces';

const CONFIG: Record<LearningStatus, { label: string; cls: string }> = {
  Completed: {
    label: 'Completed',
    cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  InProgress: {
    label: 'In Progress',
    cls: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
  },
  NotStarted: {
    label: 'Not Started',
    cls: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300',
  },
};

@Component({
  selector: 'app-ld-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      [class]="config().cls"
    >
      {{ config().label }}
    </span>
  `,
})
export class LdStatusBadge {
  readonly status = input.required<LearningStatus>();
  protected readonly config = computed(() => CONFIG[this.status()]);
}
