import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';

import { TaskStatus } from '@shared/interfaces';

import { STATUS_META } from '../tasks-nav';

@Component({
  selector: 'app-task-status-tag',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tag [value]="meta().label" [severity]="meta().severity" [icon]="meta().icon" />
  `,
})
export class TaskStatusTag {
  readonly status = input.required<TaskStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()]);
}
