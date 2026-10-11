import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from '@openng/optimus-ui/tag';

import { ProjectPriority } from '@shared/interfaces';

import { PRIORITY_META } from '../projects-nav';

@Component({
  selector: 'app-project-priority-badge',
  imports: [TagModule],
  template: `
    <p-tag
      [value]="meta().label"
      [severity]="meta().severity"
      [icon]="meta().icon"
      [rounded]="true"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectPriorityBadge {
  readonly priority = input.required<ProjectPriority>();
  readonly meta = computed(() => PRIORITY_META[this.priority()]);
}
