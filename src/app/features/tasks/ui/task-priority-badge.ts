import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';

import { TaskPriority } from '@shared/interfaces';

import { PRIORITY_META } from '../tasks-nav';

@Component({
  selector: 'app-task-priority-badge',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tag
      [value]="meta().label"
      [severity]="meta().severity"
      [icon]="meta().icon"
      [rounded]="true"
    />
  `,
})
export class TaskPriorityBadge {
  readonly priority = input.required<TaskPriority>();
  protected readonly meta = computed(() => PRIORITY_META[this.priority()]);
}
